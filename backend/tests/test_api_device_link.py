"""Device redeem — the phone spends its own code and holds its own session.

The relying-party pair is covered in ``test_api_link_codes.py``; this file
is the third endpoint, ``/link-codes/redeem-device``, where the spender is
the device itself and what comes back is a session token. Every refusal
tested here is a way a short string could otherwise become somebody's
account on a stranger's phone.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

from theourgia.api.routers.v1.link_codes import (
    CODE_ALPHABET,
    DEVICE_SESSION_LIFETIME,
    _hash,
)
from theourgia.core.auth.tokens import hash_token

DEVICE_AUDIENCE = "theourgia-app"
RELYING_CLIENT = "astropractise"
RELYING_SECRET = "a-shared-secret"
USER_ID = uuid4()
PERSONA = SimpleNamespace(id=uuid4(), display_name="Soror E.A.")


class _Result:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self) -> "_Result":
        return self

    def all(self) -> list[Any]:
        return list(self._rows)

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def scalar_one_or_none(self) -> Any:
        return self._rows[0] if self._rows else None


class _FakeSession:
    def __init__(self, results: list[_Result] | None = None):
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1


def _configure(
    monkeypatch,
    *,
    devices: str = DEVICE_AUDIENCE,
    clients: str = "",
) -> None:
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    monkeypatch.setenv("THEOURGIA_LINK_CODE_CLIENTS", clients)
    monkeypatch.setenv("THEOURGIA_DEVICE_LINK_AUDIENCES", devices)


def _make_app(db):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user, get_db_session

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER_ID,
    )
    return app


async def _mint(app, audience: str = DEVICE_AUDIENCE):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post("/api/v1/link-codes", json={"audience": audience})


async def _redeem_device(app, code: str, *, device_name: str = "Sophia's Pixel"):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post(
            "/api/v1/link-codes/redeem-device",
            json={"code": code, "device_name": device_name},
        )


def _live_row(code: str, **overrides) -> SimpleNamespace:
    row = SimpleNamespace(
        user_id=USER_ID,
        code_hash=_hash(code),
        audience=DEVICE_AUDIENCE,
        expires_at_utc=datetime.now(tz=UTC) + timedelta(minutes=5),
        redeemed_at=None,
        superseded_at=None,
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


def _session_row(db) -> Any:
    return next(r for r in db.added if hasattr(r, "token_hash"))


# ── Minting for a device audience ───────────────────────────────────


async def test_minting_works_when_only_device_audiences_exist(
    monkeypatch, reset_settings,
) -> None:
    # ⚠ A deployment whose only companion is the phone must still mint —
    # the 503 belongs to instances with no spenders of ANY kind.
    _ = reset_settings
    _configure(monkeypatch, clients="")
    db = _FakeSession([_Result([])])

    response = await _mint(_make_app(db))

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["audience"] == DEVICE_AUDIENCE
    assert set(body["code"]) <= set(CODE_ALPHABET)


async def test_an_unknown_audience_is_still_404(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([])

    assert (await _mint(_make_app(db), audience="nobody")).status_code == 404


# ── The device redeem ───────────────────────────────────────────────


async def test_the_device_gets_a_session_and_the_code_burns(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    row = _live_row("ABCD2345")
    db = _FakeSession([_Result([row]), _Result([PERSONA])])

    response = await _redeem_device(_make_app(db), "ABCD2345")

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user_id"] == str(USER_ID)
    assert body["display_name"] == "Soror E.A."
    assert body["audience"] == DEVICE_AUDIENCE

    # ⚠ The token comes back once, and the row keeps only its hash — the
    # same rule the codes themselves obey.
    session = _session_row(db)
    assert session.token_hash == hash_token(body["token"])
    assert body["token"] not in str(session.token_hash)

    # The session is the user's to find and to revoke: named by the device,
    # expiring on the device schedule, acting as the minting persona.
    assert session.user_agent == "Sophia's Pixel"
    assert session.active_persona_id == PERSONA.id
    expires = datetime.fromisoformat(body["expires_at_utc"])
    assert (
        DEVICE_SESSION_LIFETIME - timedelta(minutes=1)
        < expires - datetime.now(tz=UTC)
        <= DEVICE_SESSION_LIFETIME
    )

    assert row.redeemed_at is not None, "the code is burned"
    assert db.commits == 1


async def test_an_unnamed_device_still_links_and_says_what_it_is(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([_Result([_live_row("ABCD2345")]), _Result([])])

    response = await _redeem_device(_make_app(db), "ABCD2345", device_name="")

    assert response.status_code == 201, response.text
    # ⚠ user_agent is what the active-sessions list shows; blank would be a
    # row the user cannot recognise and therefore cannot dare to revoke.
    assert _session_row(db).user_agent == f"Linked device ({DEVICE_AUDIENCE})"


async def test_the_audit_row_carries_neither_code_nor_token(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([_Result([_live_row("ABCD2345")]), _Result([PERSONA])])

    response = await _redeem_device(_make_app(db), "ABCD2345")

    event = next(r for r in db.added if hasattr(r, "action"))
    assert event.action == "link_code.redeem_device"
    assert "ABCD2345" not in str(event.detail)
    assert response.json()["token"] not in str(event.detail)


# ── The refusals, each one refusal ──────────────────────────────────


async def test_a_relying_party_code_is_not_a_device_code(
    monkeypatch, reset_settings,
) -> None:
    # ⚠ Both kinds configured, and the code was minted for the relying
    # party. Saying "wrong kind" would confirm the code is real — so it is
    # the same 404 as a code that never existed.
    _ = reset_settings
    _configure(monkeypatch, clients=f"{RELYING_CLIENT}:{RELYING_SECRET}")
    row = _live_row("ABCD2345", audience=RELYING_CLIENT)
    db = _FakeSession([_Result([row])])

    response = await _redeem_device(_make_app(db), "ABCD2345")

    assert response.status_code == 404
    assert row.redeemed_at is None, "a refused code is not burned"


async def test_every_dead_code_gets_the_same_refusal(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    now = datetime.now(tz=UTC)
    dead = [
        _Result([]),  # unknown
        _Result([_live_row("ABCD2345", expires_at_utc=now - timedelta(seconds=1))]),
        _Result([_live_row("ABCD2345", redeemed_at=now)]),
        _Result([_live_row("ABCD2345", superseded_at=now)]),
    ]
    for result in dead:
        db = _FakeSession([result])
        response = await _redeem_device(_make_app(db), "ABCD2345")
        assert response.status_code == 404
        assert response.json()["detail"] == "That code is not valid"


async def test_no_device_audiences_means_503(monkeypatch, reset_settings) -> None:
    # ⚠ Even with relying parties configured: their door is not this door.
    _ = reset_settings
    _configure(monkeypatch, devices="", clients=f"{RELYING_CLIENT}:{RELYING_SECRET}")
    db = _FakeSession([])

    assert (await _redeem_device(_make_app(db), "ABCD2345")).status_code == 503
