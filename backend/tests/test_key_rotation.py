"""Mode A vault-key rotation tests — v1-027 · Phase 15 B5.

Covers the deliverables:

1. start: initial provision (vault's first DEK, rotation done inline);
   real rotation (new active key, old demoted, NEVER deleted); 409
   concurrency guard; wrong-master-key fail-fast BEFORE any change.
2. sweep: batched re-encryption with per-batch commits; Mode B and
   NULL payloads untouched; multi-retired-key convergence; the
   crash-between point (commit failure mid-sweep) — CRITICAL
   invariant: every blob decrypts under old or new key at every
   moment, and the sweep resumes to completion.
3. endpoints: 409 mapping, status/history shapes, scope enforcement
   (require_scope(KEY_ROTATE) on all routes + per-self policy).
4. audit rows on start / finish / failure.

Uses the DB-less fake-session style from the memorial tests. The fake
mimics transactional rollback for content blobs: on an injected commit
failure it restores blobs to the last committed checkpoint, exactly as
Postgres would.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from theourgia.core.crypto import envelope, mode_a
from theourgia.core.crypto.keys import (
    MasterKey,
    generate_data_key,
    unwrap_data_key,
    wrap_data_key,
)
from theourgia.core.crypto.rotation import (
    MODE_A_HEADER_PREFIX,
    RotationInProgressError,
    SweepTarget,
    fingerprint_wrapped_key,
    start_vault_key_rotation,
    sweep_rotation,
)
from theourgia.core.crypto.types import DecryptionError, EncryptionMode
from theourgia.core.ids import uuid7
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.crypto import KeyRotation, VaultKey
from theourgia.models.entries import Entry, EntryType, EntryVisibility

NOW = datetime(2026, 7, 20, 12, 0, tzinfo=UTC)

MASTER = MasterKey.from_secret("test-master-key")
WRONG_MASTER = MasterKey.from_secret("a-different-master-key")


# ── Fixture builders ─────────────────────────────────────────────


def make_vault_key(
    vault_id: UUID, *, master: MasterKey = MASTER, active: bool = True,
) -> tuple[VaultKey, object]:
    """A wrapped DEK row + its unwrapped DataKey (for building blobs)."""
    key_id = uuid7()
    data_key = generate_data_key(key_id)
    row = VaultKey(
        id=key_id,
        vault_id=vault_id,
        wrapped_key=wrap_data_key(master, data_key),
        active=active,
    )
    return row, data_key


def make_entry(payload: bytes | None) -> Entry:
    return Entry(
        title="An entry",
        type=EntryType.NOTE,
        excerpt="",
        glyph="feather",
        owner_id=uuid4(),
        visibility=EntryVisibility.PERSONAL,
        encrypted_payload=payload,
    )


def mode_b_blob() -> bytes:
    """A structurally valid Mode B envelope the sweep must never touch."""
    return envelope.encode(
        mode=EncryptionMode.MODE_B_ZERO_KNOWLEDGE,
        key_id=uuid4(),
        nonce=b"\x01" * envelope.MODE_B_NONCE_LEN,
        ciphertext=b"\x02" * 32,
    )


# ── Fakes ────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, rows=None, scalar=None) -> None:
        self._rows = rows or []
        self._scalar = scalar

    def scalars(self):
        return self

    def all(self):
        return list(self._rows)

    def first(self):
        return self._rows[0] if self._rows else None

    def scalar_one(self):
        return self._scalar

    def scalar_one_or_none(self):
        return self._scalar


class FakeSession:
    """Serves vault / vault_key / key_rotation / entry selects from
    in-memory fixtures and mimics per-batch transactional semantics:
    an injected commit failure restores entry blobs to the last
    committed checkpoint (as a real rollback would)."""

    def __init__(
        self,
        *,
        vaults=None,
        vault_keys=None,
        rotations=None,
        entries=None,
        batch_limit: int = 200,
        fail_on_commit: int | None = None,
    ) -> None:
        self.vaults = list(vaults or [])
        self.vault_keys = list(vault_keys or [])
        self.rotations = list(rotations or [])
        self.entries = list(entries or [])
        self.batch_limit = batch_limit
        self.fail_on_commit = fail_on_commit
        self.added: list[object] = []
        self.commits = 0
        self.rollbacks = 0
        self.executed: list[str] = []
        self._checkpoint()

    # — transactional bookkeeping —

    def _checkpoint(self) -> None:
        self._blob_snapshot = [
            (row, row.encrypted_payload) for row in self.entries
        ]

    def _restore(self) -> None:
        for row, blob in self._blob_snapshot:
            row.encrypted_payload = blob

    # — retired-key predicate (mirrors _retired_predicate in SQL) —

    def _retired_id_bytes(self) -> set[bytes]:
        return {k.id.bytes for k in self.vault_keys if not k.active}

    def _matching_entries(self) -> list[Entry]:
        retired = self._retired_id_bytes()
        out = []
        for row in self.entries:
            blob = row.encrypted_payload
            if blob is None:
                continue
            if bytes(blob[:2]) != MODE_A_HEADER_PREFIX:
                continue
            if bytes(blob[2:18]) not in retired:
                continue
            out.append(row)
        return out

    # — session protocol —

    async def execute(self, stmt):
        sql = str(stmt)
        self.executed.append(sql)
        lowered = sql.lower()
        if "key_rotation" in lowered:
            # get_active_rotation filters on `state IN (...)`; the
            # status/history queries do not.
            if "state in" in lowered:
                return FakeResult(
                    rows=[
                        r
                        for r in self.rotations
                        if r.state in ("pending", "running")
                    ],
                )
            return FakeResult(rows=list(self.rotations))
        if "vault_key" in lowered:
            return FakeResult(rows=list(self.vault_keys))
        if "from vault" in lowered:
            return FakeResult(rows=list(self.vaults))
        if "entry" in lowered:
            matching = self._matching_entries()
            if "count" in lowered:
                return FakeResult(scalar=len(matching))
            return FakeResult(rows=matching[: self.batch_limit])
        raise AssertionError(f"unexpected statement: {sql}")

    def add(self, obj) -> None:
        self.added.append(obj)
        if isinstance(obj, VaultKey):
            self.vault_keys.append(obj)
        elif isinstance(obj, KeyRotation):
            self.rotations.append(obj)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1
        if self.fail_on_commit is not None and self.commits == self.fail_on_commit:
            self._restore()
            raise RuntimeError("simulated crash at commit")
        self._checkpoint()

    async def rollback(self) -> None:
        self.rollbacks += 1
        self._restore()

    async def refresh(self, obj) -> None:
        return None


def audit_events(session: FakeSession) -> list[AuditEvent]:
    return [e for e in session.added if isinstance(e, AuditEvent)]


def decrypt_via_key_rows(
    blob: bytes, vault_keys: list[VaultKey], *, master: MasterKey = MASTER,
) -> bytes:
    """Decrypt a blob by resolving its embedded key id against the key
    table — exactly what any reader does. Proves no data loss."""
    env = envelope.decode(blob)
    row = next(k for k in vault_keys if k.id == env.key_id)
    return mode_a.decrypt(blob, unwrap_data_key(master, row.id, row.wrapped_key))


# ── start_vault_key_rotation ─────────────────────────────────────


@pytest.mark.asyncio
async def test_start_provisions_first_key_when_vault_has_none() -> None:
    vault_id = uuid4()
    session = FakeSession()

    rotation = await start_vault_key_rotation(
        session, vault_id, master=MASTER, now=NOW,
    )

    assert rotation.state == "done"
    assert rotation.old_key_id is None
    assert rotation.rows_total == 0
    assert rotation.finished_at == NOW
    new_rows = [k for k in session.vault_keys if k.active]
    assert len(new_rows) == 1
    assert rotation.new_key_id == new_rows[0].id
    # The new DEK unwraps under the configured master.
    unwrap_data_key(MASTER, new_rows[0].id, new_rows[0].wrapped_key)


@pytest.mark.asyncio
async def test_start_rotates_existing_key_and_never_deletes_it() -> None:
    vault_id = uuid4()
    old_row, _old_dk = make_vault_key(vault_id)
    old_wrapped = bytes(old_row.wrapped_key)
    session = FakeSession(vault_keys=[old_row])

    rotation = await start_vault_key_rotation(
        session, vault_id, master=MASTER, now=NOW,
    )

    assert rotation.state == "pending"
    assert rotation.old_key_id == old_row.id
    assert rotation.new_key_id is not None
    assert rotation.new_key_id != old_row.id
    # Old key: demoted, timestamped, intact — never deleted.
    assert old_row.active is False
    assert old_row.rotated_at == NOW
    assert old_row in session.vault_keys
    assert bytes(old_row.wrapped_key) == old_wrapped
    # New key is the single active one and unwraps.
    active = [k for k in session.vault_keys if k.active]
    assert [k.id for k in active] == [rotation.new_key_id]
    unwrap_data_key(MASTER, active[0].id, active[0].wrapped_key)


@pytest.mark.asyncio
async def test_start_raises_409_style_error_when_rotation_in_progress() -> None:
    vault_id = uuid4()
    old_row, _ = make_vault_key(vault_id)
    running = KeyRotation(vault_id=vault_id, state="running")
    session = FakeSession(vault_keys=[old_row], rotations=[running])

    with pytest.raises(RotationInProgressError):
        await start_vault_key_rotation(session, vault_id, master=MASTER)

    # Nothing changed.
    assert old_row.active is True
    assert len(session.vault_keys) == 1


@pytest.mark.asyncio
async def test_start_with_wrong_master_fails_without_touching_anything() -> None:
    """CRITICAL: a master key that cannot unwrap the active DEK marks
    the rotation failed and changes NOTHING else."""
    vault_id = uuid4()
    old_row, _ = make_vault_key(vault_id, master=MASTER)
    old_wrapped = bytes(old_row.wrapped_key)
    session = FakeSession(vault_keys=[old_row])

    with pytest.raises(DecryptionError):
        await start_vault_key_rotation(
            session, vault_id, master=WRONG_MASTER, now=NOW,
        )

    failed = [r for r in session.rotations if r.state == "failed"]
    assert len(failed) == 1
    assert failed[0].old_key_id == old_row.id
    assert failed[0].new_key_id is None
    assert failed[0].error == "master key cannot unwrap the active vault key"
    # No new key; old key still active and byte-identical.
    assert len(session.vault_keys) == 1
    assert old_row.active is True
    assert bytes(old_row.wrapped_key) == old_wrapped


# ── sweep_rotation ───────────────────────────────────────────────


def _rotated_fixture(
    n_entries: int = 5, *, batch_limit: int = 2, fail_on_commit: int | None = None,
):
    """A vault mid-rotation: old key retired, new key active, entries
    encrypted under the old key + one Mode B row + one NULL row."""
    vault_id = uuid4()
    old_row, old_dk = make_vault_key(vault_id, active=False)
    old_row.rotated_at = NOW
    new_row, _new_dk = make_vault_key(vault_id, active=True)
    plaintexts = [f"secret {i}".encode() for i in range(n_entries)]
    entries = [make_entry(mode_a.encrypt(p, old_dk)) for p in plaintexts]
    sealed = make_entry(mode_b_blob())
    empty = make_entry(None)
    rotation = KeyRotation(
        vault_id=vault_id,
        old_key_id=old_row.id,
        new_key_id=new_row.id,
        state="pending",
    )
    session = FakeSession(
        vault_keys=[old_row, new_row],
        rotations=[rotation],
        entries=[*entries, sealed, empty],
        batch_limit=batch_limit,
        fail_on_commit=fail_on_commit,
    )
    targets = (SweepTarget(Entry, "encrypted_payload"),)
    return session, rotation, entries, plaintexts, sealed, empty, targets


@pytest.mark.asyncio
async def test_sweep_reencrypts_in_batches_and_skips_mode_b() -> None:
    session, rotation, entries, plaintexts, sealed, empty, targets = (
        _rotated_fixture(n_entries=5, batch_limit=2)
    )
    sealed_before = bytes(sealed.encrypted_payload)

    result = await sweep_rotation(
        session, rotation, master=MASTER, batch_size=2, targets=targets, now=NOW,
    )

    assert result.state == "done"
    assert result.rows_total == 5
    assert result.rows_done == 5
    assert result.finished_at == NOW
    # 1 state commit + 3 batch commits (2+2+1) + 1 final commit.
    assert session.commits == 5
    # Every entry now decrypts under the NEW key, plaintext preserved.
    new_id = rotation.new_key_id
    for entry, plaintext in zip(entries, plaintexts, strict=True):
        env = envelope.decode(entry.encrypted_payload)
        assert env.key_id == new_id
        assert (
            decrypt_via_key_rows(entry.encrypted_payload, session.vault_keys)
            == plaintext
        )
    # Mode B and NULL rows untouched, byte for byte.
    assert bytes(sealed.encrypted_payload) == sealed_before
    assert empty.encrypted_payload is None
    # Finish audited.
    events = audit_events(session)
    assert [e.action for e in events] == ["key.rotation.finished"]
    assert events[0].kind == AuditEventKind.SECURITY
    assert events[0].outcome == AuditOutcome.SUCCESS
    assert events[0].vault_id == rotation.vault_id


@pytest.mark.asyncio
async def test_sweep_crash_between_batches_loses_nothing_and_resumes() -> None:
    """The crash-between point: the process dies after some batches
    committed. Invariant — every blob decrypts under old OR new key
    at that moment (the in-place swap is atomic per batch), the old
    key row is intact, and re-running the sweep completes."""
    session, rotation, entries, plaintexts, _sealed, _empty, targets = (
        _rotated_fixture(n_entries=5, batch_limit=2, fail_on_commit=3)
    )
    # commit#1 = state/running · commit#2 = batch 1 · commit#3 = batch 2 → crash

    with pytest.raises(RuntimeError, match="simulated crash"):
        await sweep_rotation(
            session, rotation, master=MASTER, batch_size=2, targets=targets, now=NOW,
        )

    # Batch 1 (2 rows) durably new; the failed batch rolled back to the
    # old envelopes; NOTHING is undecryptable.
    new_count = 0
    for entry, plaintext in zip(entries, plaintexts, strict=True):
        blob = entry.encrypted_payload
        assert blob is not None
        assert (
            decrypt_via_key_rows(blob, session.vault_keys) == plaintext
        )
        if envelope.decode(blob).key_id == rotation.new_key_id:
            new_count += 1
    assert new_count == 2
    # Old key row present and unwrappable throughout.
    old_row = next(k for k in session.vault_keys if k.id == rotation.old_key_id)
    unwrap_data_key(MASTER, old_row.id, old_row.wrapped_key)

    # Resume: the task reloads the rotation row (rows_done as last
    # committed) and re-dispatches. The predicate self-tracks, so the
    # sweep picks up exactly the 3 remaining rows.
    rotation.rows_done = 2
    rotation.state = "running"
    session.fail_on_commit = None
    result = await sweep_rotation(
        session, rotation, master=MASTER, batch_size=2, targets=targets, now=NOW,
    )
    assert result.state == "done"
    assert result.rows_total == 5
    assert result.rows_done == 5
    for entry, plaintext in zip(entries, plaintexts, strict=True):
        env = envelope.decode(entry.encrypted_payload)
        assert env.key_id == rotation.new_key_id
        assert (
            decrypt_via_key_rows(entry.encrypted_payload, session.vault_keys)
            == plaintext
        )


@pytest.mark.asyncio
async def test_sweep_with_wrong_master_marks_failed_without_data_loss() -> None:
    session, rotation, entries, plaintexts, _sealed, _empty, targets = (
        _rotated_fixture(n_entries=3)
    )
    blobs_before = [bytes(e.encrypted_payload) for e in entries]

    with pytest.raises(DecryptionError):
        await sweep_rotation(
            session, rotation, master=WRONG_MASTER, targets=targets, now=NOW,
        )

    assert rotation.state == "failed"
    assert rotation.error == "master key cannot unwrap the new vault key"
    assert rotation.finished_at == NOW
    # Not a single content byte changed; everything decrypts under the
    # old key via the (intact) key table.
    for entry, before, plaintext in zip(entries, blobs_before, plaintexts, strict=True):
        assert bytes(entry.encrypted_payload) == before
        assert (
            decrypt_via_key_rows(entry.encrypted_payload, session.vault_keys)
            == plaintext
        )
    # Failure audited.
    events = audit_events(session)
    assert [e.action for e in events] == ["key.rotation.failed"]
    assert events[0].outcome == AuditOutcome.FAILURE
    assert events[0].detail["error"] == "master key cannot unwrap the new vault key"


@pytest.mark.asyncio
async def test_sweep_converges_stragglers_from_earlier_rotations() -> None:
    """The sweep migrates blobs under ANY retired key — a later
    rotation's sweep collects what an earlier failed one left."""
    vault_id = uuid4()
    oldest_row, oldest_dk = make_vault_key(vault_id, active=False)
    older_row, older_dk = make_vault_key(vault_id, active=False)
    new_row, _ = make_vault_key(vault_id, active=True)
    entries = [
        make_entry(mode_a.encrypt(b"from the oldest key", oldest_dk)),
        make_entry(mode_a.encrypt(b"from the older key", older_dk)),
    ]
    rotation = KeyRotation(
        vault_id=vault_id,
        old_key_id=older_row.id,
        new_key_id=new_row.id,
        state="pending",
    )
    session = FakeSession(
        vault_keys=[oldest_row, older_row, new_row],
        rotations=[rotation],
        entries=entries,
    )
    targets = (SweepTarget(Entry, "encrypted_payload"),)

    result = await sweep_rotation(
        session, rotation, master=MASTER, targets=targets, now=NOW,
    )

    assert result.state == "done"
    assert result.rows_done == 2
    for entry in entries:
        assert envelope.decode(entry.encrypted_payload).key_id == new_row.id


# ── Endpoints ────────────────────────────────────────────────────


def _endpoint_fixture(monkeypatch, **session_kwargs):
    from theourgia.api.routers.v1 import keys as keys_module

    vault = SimpleNamespace(id=uuid4(), owner_id=uuid4())
    session = FakeSession(vaults=[vault], **session_kwargs)
    for key in session.vault_keys:
        key.vault_id = vault.id
    for rotation in session.rotations:
        rotation.vault_id = vault.id
    user = SimpleNamespace(id=vault.owner_id)
    monkeypatch.setattr(keys_module, "_load_master_key", lambda: MASTER)
    return keys_module, session, user, vault


@pytest.mark.asyncio
async def test_rotate_endpoint_starts_and_dispatches_sweep(monkeypatch) -> None:
    old_row, _ = make_vault_key(uuid4())
    keys_module, session, user, vault = _endpoint_fixture(
        monkeypatch, vault_keys=[old_row],
    )

    dispatched: list[str] = []
    from theourgia.core.tasks import key_rotation as task_module

    monkeypatch.setattr(
        task_module.run_key_rotation_sweep,
        "delay",
        dispatched.append,
    )

    response = await keys_module.start_rotation(current_user=user, db=session)

    assert response.rotation is not None
    assert response.rotation.state == "pending"
    assert response.current_key is not None
    assert response.current_key.key_id != str(old_row.id)
    assert len(response.current_key.fingerprint_sha256) == 64
    assert dispatched == [response.rotation.id]
    # Start audited (kind SECURITY, actor + vault attached).
    events = audit_events(session)
    assert [e.action for e in events] == ["key.rotation.started"]
    assert events[0].kind == AuditEventKind.SECURITY
    assert events[0].actor_id == user.id
    assert events[0].vault_id == vault.id
    assert events[0].detail["initial_provision"] is False


@pytest.mark.asyncio
async def test_rotate_endpoint_returns_409_when_running(monkeypatch) -> None:
    from fastapi import HTTPException

    old_row, _ = make_vault_key(uuid4())
    running = KeyRotation(vault_id=uuid4(), state="running")
    keys_module, session, user, _vault = _endpoint_fixture(
        monkeypatch, vault_keys=[old_row], rotations=[running],
    )

    with pytest.raises(HTTPException) as excinfo:
        await keys_module.start_rotation(current_user=user, db=session)
    assert excinfo.value.status_code == 409


@pytest.mark.asyncio
async def test_rotate_endpoint_initial_provision_completes_inline(
    monkeypatch,
) -> None:
    keys_module, session, user, _vault = _endpoint_fixture(monkeypatch)

    dispatched: list[str] = []
    from theourgia.core.tasks import key_rotation as task_module

    monkeypatch.setattr(
        task_module.run_key_rotation_sweep,
        "delay",
        dispatched.append,
    )

    response = await keys_module.start_rotation(current_user=user, db=session)

    assert response.rotation is not None
    assert response.rotation.state == "done"
    assert response.current_key is not None
    # Nothing to sweep — no worker round-trip.
    assert dispatched == []
    events = audit_events(session)
    assert events[0].detail["initial_provision"] is True


@pytest.mark.asyncio
async def test_status_endpoint_shape(monkeypatch) -> None:
    old_row, _ = make_vault_key(uuid4(), active=False)
    old_row.rotated_at = NOW
    new_row, _ = make_vault_key(uuid4(), active=True)
    rotation = KeyRotation(
        vault_id=uuid4(),
        old_key_id=old_row.id,
        new_key_id=new_row.id,
        state="running",
        rows_total=10,
        rows_done=4,
        started_at=NOW,
    )
    keys_module, session, user, _vault = _endpoint_fixture(
        monkeypatch, vault_keys=[old_row, new_row], rotations=[rotation],
    )

    response = await keys_module.rotation_status(current_user=user, db=session)

    assert response.current_key is not None
    assert response.current_key.key_id == str(new_row.id)
    assert response.current_key.fingerprint_sha256 == fingerprint_wrapped_key(
        new_row.wrapped_key
    )
    assert response.rotation is not None
    assert response.rotation.state == "running"
    assert response.rotation.rows_total == 10
    assert response.rotation.rows_done == 4
    assert response.rotation.error is None


@pytest.mark.asyncio
async def test_status_endpoint_empty_vault(monkeypatch) -> None:
    keys_module, session, user, _vault = _endpoint_fixture(monkeypatch)
    response = await keys_module.rotation_status(current_user=user, db=session)
    assert response.current_key is None
    assert response.rotation is None


@pytest.mark.asyncio
async def test_history_endpoint_shape(monkeypatch) -> None:
    old_row, _ = make_vault_key(uuid4(), active=False)
    old_row.rotated_at = NOW
    new_row, _ = make_vault_key(uuid4(), active=True)
    provision = KeyRotation(
        vault_id=uuid4(),
        old_key_id=None,
        new_key_id=old_row.id,
        state="done",
    )
    rotation = KeyRotation(
        vault_id=uuid4(),
        old_key_id=old_row.id,
        new_key_id=new_row.id,
        state="done",
        rows_total=5,
        rows_done=5,
    )
    keys_module, session, user, _vault = _endpoint_fixture(
        monkeypatch,
        vault_keys=[old_row, new_row],
        rotations=[provision, rotation],
    )

    response = await keys_module.key_history(current_user=user, db=session)

    assert len(response.items) == 2
    by_id = {item.rotation_id: item for item in response.items}
    real = by_id[str(rotation.id)]
    assert real.retired_key_fingerprint_sha256 == fingerprint_wrapped_key(
        old_row.wrapped_key
    )
    assert real.retired_at == NOW
    assert real.rows_total == 5
    initial = by_id[str(provision.id)]
    assert initial.retired_key_fingerprint_sha256 is None
    assert initial.retired_at is None


# ── Scope + wiring ───────────────────────────────────────────────


def test_keys_routes_present_authed_and_scope_gated() -> None:
    from fastapi.routing import APIRoute

    from theourgia.api.routers.v1 import keys as keys_module

    paths_methods = {
        (r.path, m)
        for r in keys_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/keys/rotate", "POST") in paths_methods
    assert ("/keys/rotation-status", "GET") in paths_methods
    assert ("/keys/history", "GET") in paths_methods

    for route in keys_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        quals = [
            getattr(d.call, "__qualname__", "")
            for d in route.dependant.dependencies
        ]
        assert any("require_scope" in q for q in quals), (
            f"{route.path} is not gated by require_scope"
        )


def test_key_rotate_is_a_self_scope() -> None:
    """The authorize substrate must allow KEY_ROTATE for any
    authenticated user (the router restricts to owned vaults)."""
    from theourgia.core.authz.defaults import _USER_SELF_SCOPES
    from theourgia.core.authz.scopes import Scope

    assert Scope.KEY_ROTATE in _USER_SELF_SCOPES


def test_key_rotation_task_module_imports() -> None:
    """Side-effect import registers the Celery task."""
    from theourgia.core.tasks import key_rotation

    assert key_rotation.run_key_rotation_sweep is not None
    from theourgia.core.tasks import celery_app

    assert (
        "theourgia.core.tasks.key_rotation.run_key_rotation_sweep"
        in celery_app.tasks
    )


def test_fingerprint_is_stable_hex() -> None:
    fp = fingerprint_wrapped_key(b"\x00" * 48)
    assert fp == fingerprint_wrapped_key(b"\x00" * 48)
    assert len(fp) == 64
    assert all(c in "0123456789abcdef" for c in fp)
