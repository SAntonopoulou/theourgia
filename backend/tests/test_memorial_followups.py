"""Memorial-mode follow-up tests — v1-018 · plan/15 §13.

Covers the four deliverables:

1. the hourly sweep's state transitions (frozen clock; warning notify
   once; automatic trigger sets ``memorialized_at``; executor notify
   once; reactivate clears the markers and re-arms the cycle);
2. the posthumous release (flagged + unsealed publishes; sealed and
   closed-tradition entries log-skip through the shared
   ``apply_publish`` path);
3. Shamir split/combine (round-trips for k=2..5 with n up to 8;
   k-1 insufficiency; tamper detection via the commitment);
4. the key-share endpoints (shares returned once, only the commitment
   stored, verify without storage, and — SECURITY — no secret
   material in the log stream).

Uses the frozen-clock (explicit ``now=``) + fake-session patterns from
the existing memorial + wellbeing tests.
"""

from __future__ import annotations

import base64
import itertools
import json
import logging
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.crypto import shamir
from theourgia.core.memorial import compute_state
from theourgia.core.tasks.memorial import (
    release_posthumous_entries,
    sweep_memorial_configs,
)
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryType,
    EntryVisibility,
)
from theourgia.models.memorial import MemorialConfig

NOW = datetime(2026, 7, 16, 12, 0, tzinfo=UTC)


# ── Fakes ────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, scalar=None, rows=None) -> None:
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return self

    def all(self):
        return list(self._rows)


class FakeSession:
    """Serves memorial_config + entry + instance_setting selects from
    in-memory fixtures. Mirrors the wellbeing-nudge fake."""

    def __init__(
        self,
        *,
        configs: list[MemorialConfig] | None = None,
        entries: list[Entry] | None = None,
        closed_slugs: str | None = None,
    ) -> None:
        self.configs = list(configs or [])
        self.entries = list(entries or [])
        self.closed_slugs = closed_slugs
        self.executed: list[str] = []
        self.added: list[object] = []
        self.commits = 0

    async def execute(self, stmt):
        sql = str(stmt)
        self.executed.append(sql)
        if "memorial_config" in sql:
            return FakeResult(
                rows=self.configs,
                scalar=self.configs[0] if self.configs else None,
            )
        if "instance_setting" in sql:
            if self.closed_slugs is None:
                return FakeResult(scalar=None)
            return FakeResult(
                scalar=SimpleNamespace(value_json=json.dumps(self.closed_slugs))
            )
        if "entry" in sql:
            return FakeResult(rows=self.entries)
        raise AssertionError(f"unexpected statement: {sql}")

    def add(self, obj) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, obj) -> None:  # noqa: ARG002 — signature parity
        return None

    @property
    def entry_queried(self) -> bool:
        return any("FROM entry" in sql for sql in self.executed)


def make_config(**overrides) -> MemorialConfig:
    defaults = dict(
        owner_id=uuid4(),
        check_in_cadence_days=180,
        warning_window_days=30,
        last_check_in_at=NOW - timedelta(days=5),
        created_at=NOW - timedelta(days=400),
    )
    defaults.update(overrides)
    return MemorialConfig(**defaults)


def make_entry(**overrides) -> Entry:
    defaults = dict(
        title="An entry",
        type=EntryType.NOTE,
        excerpt="",
        glyph="feather",
        owner_id=uuid4(),
        visibility=EntryVisibility.PERSONAL,
        publish_on_death=True,
    )
    defaults.update(overrides)
    return Entry(**defaults)


class Recorder:
    """Injectable notifier that counts calls (and can raise)."""

    def __init__(self, *, raise_error: bool = False) -> None:
        self.owner_calls: list[tuple[MemorialConfig, int | None]] = []
        self.executor_calls: list[MemorialConfig] = []
        self.raise_error = raise_error

    async def notify_owner(self, config, days_remaining) -> None:
        if self.raise_error:
            raise RuntimeError("smtp is down")
        self.owner_calls.append((config, days_remaining))

    async def notify_executor(self, config) -> None:
        if self.raise_error:
            raise RuntimeError("smtp is down")
        self.executor_calls.append(config)


async def run_sweep(session, *, now=NOW, recorder=None):
    recorder = recorder or Recorder()
    counters = await sweep_memorial_configs(
        session,
        now=now,
        notify_owner=recorder.notify_owner,
        notify_executor=recorder.notify_executor,
    )
    return counters, recorder


# ── Registration ─────────────────────────────────────────────────


def test_memorial_task_module_imports() -> None:
    """Side-effect import registers the Celery task."""
    from theourgia.core.tasks import memorial

    assert memorial.run_memorial_sweep is not None
    assert memorial.sweep_memorial_configs is not None


def test_memorial_beat_entry_registered_hourly() -> None:
    from celery.schedules import crontab

    from theourgia.core.tasks import celery_app

    schedule = celery_app.conf.beat_schedule
    assert "theourgia.memorial.sweep" in schedule
    entry = schedule["theourgia.memorial.sweep"]
    assert entry["task"] == "theourgia.core.tasks.memorial.run_memorial_sweep"
    # Hourly: a single fixed minute, every hour.
    assert entry["schedule"] == crontab(minute=20)


def test_notification_templates_registered() -> None:
    from theourgia.core.email.templates import default_registry
    from theourgia.core.notifications import default_notification_registry
    from theourgia.core.tasks.memorial import (
        CHECK_IN_REMINDER_TEMPLATE,
        EXECUTOR_NOTICE_TEMPLATE,
    )

    assert default_notification_registry.has(CHECK_IN_REMINDER_TEMPLATE)
    assert default_registry.has(EXECUTOR_NOTICE_TEMPLATE)
    # The executor notice carries the guided-steps link placeholder.
    tmpl = default_registry.get(EXECUTOR_NOTICE_TEMPLATE)
    rendered = tmpl.render(
        {"executor_name_suffix": "", "docs_url": "https://x.example/docs"}
    )
    assert "https://x.example/docs" in rendered.body_text


# ── Sweep state transitions (frozen clock) ───────────────────────


@pytest.mark.asyncio
async def test_active_config_is_left_alone() -> None:
    config = make_config()  # checked in 5 days ago
    session = FakeSession(configs=[config])
    counters, recorder = await run_sweep(session)
    assert counters["warnings_notified"] == 0
    assert counters["triggered"] == 0
    assert recorder.owner_calls == []
    assert config.memorialized_at is None
    assert session.commits == 0


@pytest.mark.asyncio
async def test_warning_notifies_owner_exactly_once() -> None:
    config = make_config(last_check_in_at=NOW - timedelta(days=200))
    assert compute_state(config, now=NOW) == "warning"
    session = FakeSession(configs=[config])

    counters, recorder = await run_sweep(session)
    assert counters["warnings_notified"] == 1
    assert len(recorder.owner_calls) == 1
    # About 10 days of the 30-day window remain (200 - 180 = 20 in).
    _, days_remaining = recorder.owner_calls[0]
    assert days_remaining == 10
    assert config.warning_notified_at == NOW
    assert config.memorialized_at is None

    # Second sweep an hour later: marker set → no re-notify.
    counters2, recorder2 = await run_sweep(
        session, now=NOW + timedelta(hours=1),
    )
    assert counters2["warnings_notified"] == 0
    assert recorder2.owner_calls == []


@pytest.mark.asyncio
async def test_lapsed_warning_window_triggers_and_notifies_executor_once() -> None:
    config = make_config(
        last_check_in_at=NOW - timedelta(days=300),
        executor_email="executor@example.com",
    )
    assert compute_state(config, now=NOW) == "memorial_pending"
    session = FakeSession(configs=[config])

    counters, recorder = await run_sweep(session)
    assert counters["triggered"] == 1
    assert counters["executors_notified"] == 1
    assert config.memorialized_at == NOW
    assert config.executor_notified_at == NOW
    assert len(recorder.executor_calls) == 1

    # Next sweep: already memorialized + marker set → nothing fires.
    counters2, recorder2 = await run_sweep(
        session, now=NOW + timedelta(hours=1),
    )
    assert counters2["triggered"] == 0
    assert counters2["executors_notified"] == 0
    assert recorder2.executor_calls == []


@pytest.mark.asyncio
async def test_trigger_without_executor_email_skips_executor_notice() -> None:
    config = make_config(last_check_in_at=NOW - timedelta(days=300))
    session = FakeSession(configs=[config])
    counters, recorder = await run_sweep(session)
    assert counters["triggered"] == 1
    assert counters["executors_notified"] == 0
    assert recorder.executor_calls == []
    assert config.executor_notified_at is None


@pytest.mark.asyncio
async def test_manually_memorialized_config_gets_executor_notice() -> None:
    """A manual /trigger (even with cadence 0) still notifies the
    executor on the next sweep."""
    config = make_config(
        check_in_cadence_days=0,
        memorialized_at=NOW - timedelta(hours=2),
        executor_email="executor@example.com",
    )
    session = FakeSession(configs=[config])
    counters, recorder = await run_sweep(session)
    assert counters["executors_notified"] == 1
    assert len(recorder.executor_calls) == 1


@pytest.mark.asyncio
async def test_reactivate_clears_markers_and_rearms_the_cycle() -> None:
    """Full cycle: warning → trigger → reactivate → warning again."""
    from theourgia.api.routers.v1.memorial import reactivate

    config = make_config(
        last_check_in_at=NOW - timedelta(days=300),
        executor_email="executor@example.com",
    )
    session = FakeSession(configs=[config])
    await run_sweep(session)
    assert config.memorialized_at is not None
    assert config.executor_notified_at is not None

    # Reactivate through the real endpoint handler.
    user = SimpleNamespace(id=config.owner_id)
    await reactivate(db=session, current_user=user)
    assert config.memorialized_at is None
    assert config.warning_notified_at is None
    assert config.executor_notified_at is None

    # A fresh lapse cycle notifies again. Re-freeze the check-in the
    # endpoint just stamped (it used the wall clock) so the arithmetic
    # stays deterministic wherever the suite runs.
    config.last_check_in_at = NOW
    later = NOW + timedelta(days=200)
    counters, recorder = await run_sweep(session, now=later)
    assert counters["warnings_notified"] == 1
    assert len(recorder.owner_calls) == 1


@pytest.mark.asyncio
async def test_notifier_error_never_aborts_the_sweep() -> None:
    """Mirror the backup task: one failing config is logged, the rest
    of the sweep completes."""
    broken = make_config(last_check_in_at=NOW - timedelta(days=200))
    healthy = make_config(last_check_in_at=NOW - timedelta(days=200))
    session = FakeSession(configs=[broken, healthy])

    calls = {"n": 0}

    async def flaky_notify_owner(config, days_remaining) -> None:
        calls["n"] += 1
        if config is broken:
            raise RuntimeError("smtp is down")

    counters = await sweep_memorial_configs(
        session,
        now=NOW,
        notify_owner=flaky_notify_owner,
        notify_executor=Recorder().notify_executor,
    )
    assert calls["n"] == 2  # both attempted
    assert counters["errors"] == 1
    assert counters["warnings_notified"] == 1
    assert healthy.warning_notified_at == NOW
    # The failed config keeps a clear marker so the next sweep retries.
    assert broken.warning_notified_at is None


# ── Posthumous release ───────────────────────────────────────────


def _memorialized_config(**overrides) -> MemorialConfig:
    return make_config(
        memorialized_at=NOW - timedelta(days=1),
        posthumous_publications_enabled=True,
        **overrides,
    )


@pytest.mark.asyncio
async def test_posthumous_release_publishes_flagged_unsealed_entries() -> None:
    config = _memorialized_config()
    entry = make_entry(owner_id=config.owner_id)
    session = FakeSession(configs=[config], entries=[entry])

    counters, _ = await run_sweep(session)
    assert counters["posthumous_published"] == 1
    assert counters["posthumous_skipped"] == 0
    assert entry.published_at == NOW
    assert entry.visibility == EntryVisibility.PUBLIC
    assert session.commits == 1


@pytest.mark.asyncio
async def test_posthumous_release_never_publishes_sealed_entries(
    caplog: pytest.LogCaptureFixture,
) -> None:
    config = _memorialized_config()
    entry = make_entry(
        owner_id=config.owner_id,
        encryption_mode=EncryptionMode.SEALED,
    )
    session = FakeSession(configs=[config], entries=[entry])

    with caplog.at_level(logging.INFO):
        counters, _ = await run_sweep(session)
    assert counters["posthumous_published"] == 0
    assert counters["posthumous_skipped"] == 1
    assert entry.published_at is None
    assert entry.visibility == EntryVisibility.PERSONAL
    skip_records = [
        r for r in caplog.records if r.message == "memorial.posthumous.skipped"
    ]
    assert len(skip_records) == 1
    assert "Sealed" in str(getattr(skip_records[0], "reason", ""))


@pytest.mark.asyncio
async def test_posthumous_release_respects_closed_traditions(
    caplog: pytest.LogCaptureFixture,
) -> None:
    config = _memorialized_config()
    entry = make_entry(
        owner_id=config.owner_id,
        tradition_tags=["Closed Way"],
    )
    session = FakeSession(
        configs=[config],
        entries=[entry],
        closed_slugs="closed-way",
    )

    with caplog.at_level(logging.INFO):
        counters, _ = await run_sweep(session)
    assert counters["posthumous_published"] == 0
    assert counters["posthumous_skipped"] == 1
    assert entry.published_at is None
    assert entry.visibility == EntryVisibility.PERSONAL
    skip_records = [
        r for r in caplog.records if r.message == "memorial.posthumous.skipped"
    ]
    assert len(skip_records) == 1
    assert "closed-way" in str(getattr(skip_records[0], "reason", ""))


@pytest.mark.asyncio
async def test_posthumous_release_requires_opt_in() -> None:
    """posthumous_publications_enabled=False → entries never queried."""
    config = make_config(
        memorialized_at=NOW - timedelta(days=1),
        posthumous_publications_enabled=False,
    )
    session = FakeSession(configs=[config], entries=[make_entry()])
    counters, _ = await run_sweep(session)
    assert counters["posthumous_published"] == 0
    assert not session.entry_queried


@pytest.mark.asyncio
async def test_release_query_targets_flagged_unpublished_entries() -> None:
    """The SQL predicate is the contract: only flagged, unpublished,
    non-deleted entries of the memorialized owner are candidates."""
    config = _memorialized_config()
    session = FakeSession(configs=[config], entries=[])
    await release_posthumous_entries(session, config, now=NOW)
    (sql,) = [s for s in session.executed if "FROM entry" in s]
    assert "publish_on_death" in sql
    assert "published_at IS NULL" in sql
    assert "deleted_at IS NULL" in sql
    assert "owner_id" in sql


# ── Shamir secret sharing ────────────────────────────────────────


@settings(max_examples=40, deadline=None)
@given(
    secret=st.binary(min_size=1, max_size=64),
    k=st.integers(min_value=2, max_value=5),
    n_extra=st.integers(min_value=0, max_value=3),
    data=st.data(),
)
def test_shamir_round_trips_any_k_of_n(secret, k, n_extra, data) -> None:
    """Property: any k of n shares reconstruct the secret (n ≤ 8)."""
    n = min(k + n_extra, 8)
    shares = shamir.split(secret, n, k)
    assert len(shares) == n
    assert all(len(s) == len(secret) + 1 for s in shares)
    subset = data.draw(
        st.permutations(shares).map(lambda p: p[:k]), label="subset",
    )
    assert shamir.combine(subset) == secret


@settings(max_examples=40, deadline=None)
@given(
    secret=st.binary(min_size=8, max_size=64),
    k=st.integers(min_value=2, max_value=5),
)
def test_shamir_k_minus_one_shares_reveal_nothing(secret, k) -> None:
    """Combining k-1 shares interpolates to a WRONG value — Shamir is
    information-theoretically secure below the threshold (see the
    module docstring for the counting argument). With ≥ 64 bits of
    secret the collision probability is negligible."""
    shares = shamir.split(secret, k + 2, k)
    assert shamir.combine(shares[: k - 1]) != secret


def test_shamir_fixed_vector_round_trip() -> None:
    """Deterministic vector: exercises every code path without
    hypothesis so a failure localizes immediately."""
    secret = bytes(range(32))
    shares = shamir.split(secret, 5, 3)
    for combo in itertools.combinations(shares, 3):
        assert shamir.combine(combo) == secret
    # More than k shares also works.
    assert shamir.combine(shares) == secret


def test_shamir_rejects_bad_parameters() -> None:
    with pytest.raises(ValueError):
        shamir.split(b"", 3, 2)
    with pytest.raises(ValueError):
        shamir.split(b"x", 2, 3)  # k > n
    with pytest.raises(ValueError):
        shamir.split(b"x", 256, 2)  # too many shares
    with pytest.raises(ValueError):
        shamir.combine([])
    with pytest.raises(ValueError):
        shamir.combine([b"\x01\x10", b"\x01\x20"])  # duplicate x
    with pytest.raises(ValueError):
        shamir.combine([b"\x00\x10", b"\x02\x20"])  # forbidden x=0
    with pytest.raises(ValueError):
        shamir.combine([b"\x01\x10", b"\x02\x20\x30"])  # ragged lengths


# ── Key-share endpoints ──────────────────────────────────────────


def _key_share_session() -> tuple[FakeSession, SimpleNamespace, MemorialConfig]:
    config = make_config()
    session = FakeSession(configs=[config])
    user = SimpleNamespace(id=config.owner_id)
    return session, user, config


@pytest.mark.asyncio
async def test_key_share_returns_shares_once_and_stores_only_commitment() -> None:
    from theourgia.api.routers.v1.memorial import (
        KeyShareCreateRequest,
        create_key_share,
    )

    session, user, config = _key_share_session()
    secret = bytes(range(32))
    payload = KeyShareCreateRequest(
        secret_b64=base64.b64encode(secret).decode(),
        shares=3,
        threshold=2,
    )
    response = await create_key_share(payload, db=session, current_user=user)

    assert response.n == 3
    assert response.k == 2
    assert len(response.shares_b64) == 3
    shares = [base64.b64decode(s) for s in response.shares_b64]
    assert shamir.combine(shares[:2]) == secret

    envelope = config.key_share_envelope
    assert envelope is not None
    assert envelope["algo"] == "shamir-gf256"
    assert envelope["n"] == 3
    assert envelope["k"] == 2
    assert envelope["commitment"].startswith("sha256:")
    # The envelope must contain neither the secret nor any share.
    blob = json.dumps(envelope)
    assert base64.b64encode(secret).decode() not in blob
    for share_b64 in response.shares_b64:
        assert share_b64 not in blob


@pytest.mark.asyncio
async def test_key_share_verify_accepts_reconstruction_rejects_tamper() -> None:
    from theourgia.api.routers.v1.memorial import (
        KeyShareCreateRequest,
        KeyShareVerifyRequest,
        create_key_share,
        verify_key_share,
    )

    session, user, _config = _key_share_session()
    secret = b"\x01" * 32
    response = await create_key_share(
        KeyShareCreateRequest(
            secret_b64=base64.b64encode(secret).decode(),
            shares=4,
            threshold=2,
        ),
        db=session,
        current_user=user,
    )
    shares = [base64.b64decode(s) for s in response.shares_b64]

    # Correct reconstruction verifies.
    good = shamir.combine(shares[:2])
    ok = await verify_key_share(
        KeyShareVerifyRequest(secret_b64=base64.b64encode(good).decode()),
        db=session,
        current_user=user,
    )
    assert ok.verified is True

    # Tampered share → wrong reconstruction → commitment catches it.
    tampered = bytearray(shares[0])
    tampered[1] ^= 0xFF
    bad = shamir.combine([bytes(tampered), shares[1]])
    assert bad != secret
    not_ok = await verify_key_share(
        KeyShareVerifyRequest(secret_b64=base64.b64encode(bad).decode()),
        db=session,
        current_user=user,
    )
    assert not_ok.verified is False

    # Insufficient shares (k-1 = 1) → wrong value → refused too.
    under = shamir.combine(shares[:1])
    assert under != secret
    not_ok2 = await verify_key_share(
        KeyShareVerifyRequest(secret_b64=base64.b64encode(under).decode()),
        db=session,
        current_user=user,
    )
    assert not_ok2.verified is False


@pytest.mark.asyncio
async def test_key_share_validation_and_state_guards() -> None:
    from fastapi import HTTPException

    from theourgia.api.routers.v1.memorial import (
        KeyShareCreateRequest,
        KeyShareVerifyRequest,
        create_key_share,
        verify_key_share,
    )

    session, user, config = _key_share_session()

    # threshold > shares → 422.
    with pytest.raises(HTTPException) as exc:
        await create_key_share(
            KeyShareCreateRequest(secret_b64="QUFBQQ==", shares=2, threshold=3),
            db=session,
            current_user=user,
        )
    assert exc.value.status_code == 422

    # Not base64 → 422.
    with pytest.raises(HTTPException) as exc:
        await create_key_share(
            KeyShareCreateRequest(secret_b64="!!!", shares=3, threshold=2),
            db=session,
            current_user=user,
        )
    assert exc.value.status_code == 422

    # Verify before any key-share exists → 404.
    with pytest.raises(HTTPException) as exc:
        await verify_key_share(
            KeyShareVerifyRequest(secret_b64="QUFBQQ=="),
            db=session,
            current_user=user,
        )
    assert exc.value.status_code == 404

    # Memorialized vault → key-share frozen (403).
    config.memorialized_at = NOW
    with pytest.raises(HTTPException) as exc:
        await create_key_share(
            KeyShareCreateRequest(secret_b64="QUFBQQ==", shares=3, threshold=2),
            db=session,
            current_user=user,
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_key_share_endpoints_never_log_secret_material(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """SECURITY (threat model T2): the secret transits the request in
    memory only — nothing derived from it may reach the log stream."""
    from theourgia.api.routers.v1.memorial import (
        KeyShareCreateRequest,
        KeyShareVerifyRequest,
        create_key_share,
        verify_key_share,
    )

    session, user, _config = _key_share_session()
    secret = b"super-secret-vault-key-material!"
    secret_b64 = base64.b64encode(secret).decode()

    with caplog.at_level(logging.DEBUG):
        response = await create_key_share(
            KeyShareCreateRequest(secret_b64=secret_b64, shares=3, threshold=2),
            db=session,
            current_user=user,
        )
        await verify_key_share(
            KeyShareVerifyRequest(secret_b64=secret_b64),
            db=session,
            current_user=user,
        )

    stream = "\n".join(
        f"{r.getMessage()} {r.args!r} {r.__dict__!r}" for r in caplog.records
    )
    assert secret_b64 not in stream
    assert repr(secret) not in stream
    for share_b64 in response.shares_b64:
        assert share_b64 not in stream


def test_key_share_routes_present_and_authed() -> None:
    from fastapi.routing import APIRoute

    from theourgia.api.deps import get_current_user
    from theourgia.api.routers.v1 import memorial as memorial_module

    paths_methods = {
        (r.path, m)
        for r in memorial_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/memorial/key-share", "POST") in paths_methods
    assert ("/memorial/key-share/verify", "POST") in paths_methods

    for route in memorial_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        if not route.path.startswith("/memorial/key-share"):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names = [
            sub.call.__name__
            for d in deps
            for sub in d.dependencies
            if hasattr(sub.call, "__name__")
        ]
        assert (
            get_current_user in calls or "get_current_user" in sub_names
        ), f"{route.path} does not require auth"


# ── Entry flag surface ───────────────────────────────────────────


def test_entry_schemas_carry_publish_on_death() -> None:
    from theourgia.api.routers.v1.entries import (
        EntryCreate,
        EntryRead,
        EntryUpdate,
    )

    assert EntryCreate(title="t").publish_on_death is False
    assert EntryCreate(title="t", publish_on_death=True).publish_on_death is True
    # PATCH: absent means unchanged.
    assert EntryUpdate().model_dump(exclude_unset=True) == {}
    assert EntryUpdate(publish_on_death=True).publish_on_death is True
    assert EntryRead.model_fields["publish_on_death"].default is False
