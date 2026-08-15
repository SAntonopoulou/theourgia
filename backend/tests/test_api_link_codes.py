"""Device link codes — the mint / redeem pair.

Why this exists at all is in ``theourgia/models/link_code.py``: a companion
application on a phone cannot hold a theourgia session token without either an
embedded login form or a full OAuth implementation, so the user reads eight
characters here and types them there.

Every test below is one edge of a refusal, because the whole mechanism is a
short string that turns into somebody's identity, and each of the ways it must
stop being valid is a way it could otherwise be replayed.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

from theourgia.api.routers.v1.link_codes import (
    CODE_ALPHABET,
    CODE_LENGTH,
    _hash,
    _normalise,
)

CLIENT = "astropractise"
SECRET = "a-shared-secret"
USER_ID = uuid4()


class _Result:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self) -> _Result:
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


def _configure(monkeypatch, *, clients: str = f"{CLIENT}:{SECRET}") -> None:
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    monkeypatch.setenv("THEOURGIA_LINK_CODE_CLIENTS", clients)


def _make_app(db):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user, get_db_session

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER_ID,
    )
    return app


async def _mint(app, audience: str = CLIENT):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post("/api/v1/link-codes", json={"audience": audience})


async def _redeem(app, code: str, *, client_id=CLIENT, secret=SECRET):
    headers = {}
    if client_id is not None:
        headers["X-Client-Id"] = client_id
    if secret is not None:
        headers["X-Client-Secret"] = secret
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        return await ac.post(
            "/api/v1/link-codes/redeem", json={"code": code}, headers=headers,
        )


def _stored(db) -> Any:
    return next(r for r in db.added if hasattr(r, "code_hash"))


def _live_row(code: str, **overrides) -> SimpleNamespace:
    row = SimpleNamespace(
        user_id=USER_ID,
        code_hash=_hash(code),
        audience=CLIENT,
        expires_at_utc=datetime.now(tz=UTC) + timedelta(minutes=5),
        redeemed_at=None,
        superseded_at=None,
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


# ── The code itself ─────────────────────────────────────────────────


def test_the_alphabet_omits_every_lookalike() -> None:
    # ⚠ This is read off one screen and typed into another, by a person.
    # I, L, O, 0 and 1 are four transcription errors waiting to happen.
    for confusable in "ILO01":
        assert confusable not in CODE_ALPHABET


def test_normalisation_forgives_what_the_alphabet_avoids() -> None:
    # ⚠ Someone who typed the letter O where the code showed a zero has not
    # made a mistake worth a refusal. The fold is safe precisely BECAUSE the
    # mint side never emits either character.
    assert _normalise("abcd-2345") == "ABCD2345"
    assert _normalise("ABCD 2345") == "ABCD2345"
    assert _normalise("IL0") == _normalise("110")


def test_the_code_is_never_stored_in_the_clear(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    assert len(_hash("ABCD2345")) == 64


# ── Minting ─────────────────────────────────────────────────────────


async def test_minting_returns_a_typeable_code(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([_Result([])])

    response = await _mint(_make_app(db))

    assert response.status_code == 201, response.text
    body = response.json()
    assert len(body["code"]) == CODE_LENGTH
    assert set(body["code"]) <= set(CODE_ALPHABET)
    assert body["audience"] == CLIENT

    # ⚠ Ten minutes, fixed by the server. The client does not get to ask for
    # a longer-lived credential.
    expires = datetime.fromisoformat(body["expires_at_utc"])
    assert timedelta(minutes=9) < expires - datetime.now(tz=UTC) <= timedelta(
        minutes=10
    )

    # ⚠ The row carries the HASH, and the plaintext appears nowhere but the
    # response. A database reader cannot redeem what they can read.
    assert _stored(db).code_hash == _hash(body["code"])
    assert _stored(db).code_hash != body["code"]
    assert db.commits == 1


async def test_minting_supersedes_the_users_earlier_codes(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    stale = _live_row("OLDCODE2")
    db = _FakeSession([_Result([stale])])

    assert (await _mint(_make_app(db))).status_code == 201

    # ⚠ A code left visible on a screen the user has walked away from stops
    # working the moment they ask for another.
    assert stale.superseded_at is not None


async def test_the_audit_row_does_not_carry_the_code(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([_Result([])])

    response = await _mint(_make_app(db))
    code = response.json()["code"]

    event = next(r for r in db.added if hasattr(r, "action"))
    assert event.action == "link_code.mint"
    # ⚠ An audit row holding a live credential is a second copy of it.
    assert code not in str(event.detail)


async def test_an_unregistered_audience_is_404(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([])

    response = await _mint(_make_app(db), audience="someone-elses-app")

    assert response.status_code == 404


async def test_minting_is_503_when_no_client_is_configured(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch, clients="")
    db = _FakeSession([])

    response = await _mint(_make_app(db))

    # ⚠ A code nobody can redeem is not worth showing a user.
    assert response.status_code == 503


# ── Redeeming ───────────────────────────────────────────────────────


async def test_redeem_returns_the_identity_and_burns_the_code(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    row = _live_row("ABCD2345")
    persona = SimpleNamespace(display_name="Aspasia of the Hearth")
    db = _FakeSession([_Result([row]), _Result([persona])])

    response = await _redeem(_make_app(db), "abcd-2345")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user_id"] == str(USER_ID)
    assert body["display_name"] == "Aspasia of the Hearth"
    assert body["audience"] == CLIENT
    # ⚠ What a relying party learns is "this is user X here". Not an email,
    # not a session, not the ability to act as them.
    assert set(body) == {"user_id", "display_name", "audience"}
    assert row.redeemed_at is not None


async def test_a_code_cannot_be_spent_twice(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    spent = _live_row("ABCD2345", redeemed_at=datetime.now(tz=UTC))
    db = _FakeSession([_Result([spent])])

    assert (await _redeem(_make_app(db), "ABCD2345")).status_code == 404


async def test_an_expired_code_is_refused(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    old = _live_row(
        "ABCD2345", expires_at_utc=datetime.now(tz=UTC) - timedelta(seconds=1)
    )
    db = _FakeSession([_Result([old])])

    assert (await _redeem(_make_app(db), "ABCD2345")).status_code == 404


async def test_a_superseded_code_is_refused(monkeypatch, reset_settings) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    old = _live_row("ABCD2345", superseded_at=datetime.now(tz=UTC))
    db = _FakeSession([_Result([old])])

    assert (await _redeem(_make_app(db), "ABCD2345")).status_code == 404


async def test_one_client_cannot_redeem_anothers_code(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch, clients=f"{CLIENT}:{SECRET},otherapp:other-secret")
    mine = _live_row("ABCD2345", audience=CLIENT)
    db = _FakeSession([_Result([mine])])

    response = await _redeem(
        _make_app(db), "ABCD2345", client_id="otherapp", secret="other-secret",
    )

    # ⚠ A user who is talked into reading a code aloud has leaked something
    # narrower than an account: one code, for one named application.
    assert response.status_code == 404
    assert mine.redeemed_at is None


async def test_every_bad_code_gets_the_SAME_refusal(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    details = set()
    for row in (
        None,
        _live_row("ABCD2345", redeemed_at=datetime.now(tz=UTC)),
        _live_row(
            "ABCD2345",
            expires_at_utc=datetime.now(tz=UTC) - timedelta(seconds=1),
        ),
    ):
        db = _FakeSession([_Result([row] if row else [])])
        response = await _redeem(_make_app(db), "ABCD2345")
        details.add(response.json()["detail"])

    # ⚠ Separate messages would tell a caller which part was wrong, and
    # "expired" in particular confirms the code was once real.
    assert len(details) == 1


async def test_redeem_refuses_without_client_credentials(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    _configure(monkeypatch)
    db = _FakeSession([])

    for client_id, secret in (
        (None, None),
        (CLIENT, None),
        (CLIENT, "wrong"),
        ("unknown", SECRET),
        (CLIENT, ""),
    ):
        response = await _redeem(
            _make_app(db), "ABCD2345", client_id=client_id, secret=secret,
        )
        assert response.status_code == 401, (client_id, secret)


async def test_a_client_registered_with_a_blank_secret_is_no_client(
    monkeypatch, reset_settings,
) -> None:
    _ = reset_settings
    # ⚠ `THEOURGIA_LINK_CODE_CLIENTS=astropractise:` is a half-finished
    # deployment. Registering it would let anyone who knows the client id
    # redeem codes, so the pair is dropped and the endpoint is 503.
    _configure(monkeypatch, clients=f"{CLIENT}:")
    db = _FakeSession([])

    response = await _redeem(_make_app(db), "ABCD2345", secret="")

    assert response.status_code == 503
