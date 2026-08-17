"""Device link codes — link a companion app's account to a theourgia one.

::

  POST /api/v1/link-codes                mint a code (the signed-in user)
  POST /api/v1/link-codes/redeem         spend one (a registered relying party)
  POST /api/v1/link-codes/redeem-device  spend one (the device itself)

The reasoning for the whole mechanism is in :mod:`theourgia.models.link_code`.
The short version: the user reads eight characters here and types them there.
What the spender receives depends on which kind of spender it is:

* A **relying party** (astropractise) redeems server-to-server, presenting a
  client secret, and receives an *identity* — "this is user X here" — and no
  session. Its own server holds its own accounts.

* A **device audience** (the theourgia mobile app) has no server and no
  secret to hold. The phone redeems the code itself and receives a *session
  token of its own* — the thing the sync API will authenticate by. The
  session lands in the user's active-sessions list under the device's name,
  revocable like any other. This is the answer to "a phone cannot hold a
  theourgia session token": it can, when the session is minted by a
  short-lived code the signed-in user read off their own screen, rather
  than by a password typed into an embedded form.

## ⚠ What relying-party redeem returns, and what it does not

The user's id, their display name, and the audience. **Not** their email, not
their vaults, not a session. A relying party learns "this is user X here", which
is the entire question it asked, and gets no ability to act as them.

## ⚠ Every endpoint fails closed when nothing is configured

No configured clients AND no device audiences means 503 everywhere here. A
code nobody can redeem is not worth showing a user, and a redeem endpoint
that accepts requests on a deployment with no spenders is a surface with no
purpose. Each redeem door only opens for its own kind: a relying-party code
cannot be spent by a device, nor a device code by a relying party.

## On brute force

A code carries ~39.6 bits, lives ten minutes, and at most one is live per
(user, audience). Guessing is not the door in. No endpoint here is
rate-limited beyond what the reverse proxy applies — the same posture as
sign-in — and `core/ratelimit` is there the day that posture changes.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from theourgia.api.deps import CurrentUser, DBSession
from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.core.config import get_settings
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.identity import Session as SessionRow
from theourgia.models.link_code import LinkCode
from theourgia.models.persona import Persona

__all__ = ["router"]


router = APIRouter()


CODE_TTL = timedelta(minutes=10)
"""Long enough to walk from a browser to a phone, short enough that a code
left on a screen is not a standing credential."""

DEVICE_SESSION_LIFETIME = timedelta(days=180)
"""⚠ Deliberately long. The app is offline-first — it must keep working with
no server at all — so an expiry is not a security boundary here, revocation
is: the session sits in the user's active-sessions list under the device's
name. Six months bounds how long a *forgotten* device stays linked."""

CODE_LENGTH = 8

CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
"""⚠ No I, L, O, 0 or 1. This is read off one screen and typed into another,
by a person, and every one of those characters is a pair somebody will
transcribe wrongly. Thirty-one characters, so eight of them carry ~39.6 bits."""

_AMBIGUOUS = {"I": "1", "L": "1", "O": "0"}
"""Read the other way at NORMALISATION time: someone who typed the letter O
where the code showed a zero has not made a mistake worth a refusal."""


# ── Schemas ─────────────────────────────────────────────────────────


class MintPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audience: str = Field(min_length=1, max_length=64)


class LinkCodeRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    audience: str
    expires_at_utc: datetime


class RedeemPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=32)


class RedeemedIdentity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    display_name: str | None
    audience: str


class DeviceRedeemPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=32)
    device_name: str = Field(default="", max_length=120)
    """Shown in the user's active-sessions list — "Theourgia on Sophia's
    Pixel". The device names itself; an empty name still links."""


class DeviceSessionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    """⚠ The plaintext session token, returned exactly once. The server
    keeps only its hash; the device keeps the token."""
    user_id: str
    display_name: str | None
    audience: str
    expires_at_utc: datetime


# ── Helpers ─────────────────────────────────────────────────────────


def _normalise(code: str) -> str:
    """Uppercase, strip separators, and fold the characters people confuse.

    ⚠ Folding is one-way and total: the mint side never emits I, L, O, 0 or 1,
    so mapping every one of them onto its lookalike cannot collide with a
    different real code.
    """
    cleaned = "".join(
        ch for ch in code.upper() if ch.isalnum()
    )
    return "".join(_AMBIGUOUS.get(ch, ch) for ch in cleaned)


def _hash(code: str) -> str:
    return hashlib.sha256(_normalise(code).encode("ascii")).hexdigest()


def _fresh_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def _configured_clients() -> dict[str, str]:
    clients = get_settings().link_code_client_secrets
    if not clients:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No companion applications are configured on this instance",
        )
    return clients


def _configured_device_audiences() -> frozenset[str]:
    audiences = get_settings().device_link_audience_set
    if not audiences:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No companion applications are configured on this instance",
        )
    return audiences


def _mintable_audiences() -> frozenset[str]:
    """Every audience a code may be minted for — relying parties and device
    audiences together. 503 only when there are none of either kind."""
    settings = get_settings()
    audiences = (
        frozenset(settings.link_code_client_secrets) | settings.device_link_audience_set
    )
    if not audiences:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No companion applications are configured on this instance",
        )
    return audiences


async def _first_active_persona(db: DBSession, user_id) -> Persona | None:
    return (
        (
            await db.execute(
                select(Persona)
                .where(Persona.user_id == user_id, Persona.is_active.is_(True))
                .order_by(Persona.kind, Persona.created_at)
            )
        )
        .scalars()
        .first()
    )


def _authenticate_client(client_id: str | None, client_secret: str | None) -> str:
    """⚠ Constant-time, and it refuses identically for an unknown client and a
    wrong secret. Distinguishing them would turn this into an oracle for which
    relying parties an instance has registered."""
    clients = _configured_clients()
    expected = clients.get((client_id or "").strip(), "")
    presented = (client_secret or "").strip()
    # ⚠ `expected` is "" for an unknown client, and compare_digest("", "")
    # is True — so the emptiness of the presented secret is checked too.
    if not expected or not presented or not hmac.compare_digest(expected, presented):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown client or bad secret",
        )
    return (client_id or "").strip()


# ── Endpoints ──────────────────────────────────────────────────────


@router.post(
    "/link-codes",
    summary="Mint a device link code",
    description=(
        "Return a short code the signed-in user can type into a companion "
        "application. Live for ten minutes, usable once, and valid only for "
        "the named audience."
    ),
    response_model=LinkCodeRead,
    status_code=status.HTTP_201_CREATED,
)
async def mint(
    payload: MintPayload,
    user: CurrentUser,
    db: DBSession,
) -> LinkCodeRead:
    audience = payload.audience.strip()
    if audience not in _mintable_audiences():
        # ⚠ 404 rather than 403. The set of relying parties an instance has
        # registered is not a secret worth much, but it is not the user's
        # business either, and "no such audience" is the true answer.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such companion application",
        )

    now = datetime.now(tz=UTC)

    # ⚠ Supersede this user's earlier live codes for the same audience. A code
    # on a screen they have walked away from stops working the moment they ask
    # for another, and only one code per (user, audience) is ever live.
    live = (
        (
            await db.execute(
                select(LinkCode).where(
                    LinkCode.user_id == user.id,
                    LinkCode.audience == audience,
                    LinkCode.redeemed_at.is_(None),
                    LinkCode.superseded_at.is_(None),
                )
            )
        )
        .scalars()
        .all()
    )
    for row in live:
        row.superseded_at = now
        db.add(row)

    code = _fresh_code()
    expires = now + CODE_TTL
    db.add(
        LinkCode(
            user_id=user.id,
            code_hash=_hash(code),
            audience=audience,
            expires_at_utc=expires,
        )
    )
    db.add(
        AuditEvent(
            kind=AuditEventKind.AUTH,
            action="link_code.mint",
            actor_id=user.id,
            outcome=AuditOutcome.SUCCESS,
            # ⚠ The audience and how many codes this replaced. NOT the code —
            # an audit row holding a live credential is a second copy of it.
            detail={"audience": audience, "superseded": len(live)},
        )
    )
    await db.commit()

    return LinkCodeRead(code=code, audience=audience, expires_at_utc=expires)


@router.post(
    "/link-codes/redeem",
    summary="Redeem a device link code",
    description=(
        "Server-to-server. A registered companion application exchanges a code "
        "for the identity of the user who minted it. The code is burned."
    ),
    response_model=RedeemedIdentity,
)
async def redeem(
    payload: RedeemPayload,
    db: DBSession,
    x_client_id: Annotated[str | None, Header()] = None,
    x_client_secret: Annotated[str | None, Header()] = None,
) -> RedeemedIdentity:
    client_id = _authenticate_client(x_client_id, x_client_secret)

    row = (
        await db.execute(
            select(LinkCode).where(LinkCode.code_hash == _hash(payload.code))
        )
    ).scalar_one_or_none()

    now = datetime.now(tz=UTC)
    # ⚠ ONE refusal for every way a code can be no good — unknown, expired,
    # already spent, superseded, or minted for a different client. Separate
    # messages would tell a caller holding a wrong code which part was wrong,
    # and "expired" in particular confirms that the code was once real.
    if (
        row is None
        or row.audience != client_id
        or row.redeemed_at is not None
        or row.superseded_at is not None
        or row.expires_at_utc <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That code is not valid",
        )

    row.redeemed_at = now
    db.add(row)

    persona = await _first_active_persona(db, row.user_id)

    db.add(
        AuditEvent(
            kind=AuditEventKind.AUTH,
            action="link_code.redeem",
            actor_id=row.user_id,
            outcome=AuditOutcome.SUCCESS,
            detail={"audience": client_id},
        )
    )
    await db.commit()

    return RedeemedIdentity(
        user_id=str(row.user_id),
        # ⚠ The persona's display name, not the account's email. A companion
        # application is being told who to show, not how to reach them.
        display_name=persona.display_name if persona else None,
        audience=client_id,
    )


@router.post(
    "/link-codes/redeem-device",
    summary="Redeem a device link code from the device itself",
    description=(
        "A device (the theourgia mobile app) exchanges a code for a session "
        "token of its own. The code is burned; the session appears in the "
        "user's active-sessions list under the device's name, revocable "
        "like any other."
    ),
    response_model=DeviceSessionRead,
    status_code=status.HTTP_201_CREATED,
)
async def redeem_device(
    payload: DeviceRedeemPayload,
    db: DBSession,
) -> DeviceSessionRead:
    audiences = _configured_device_audiences()

    row = (
        await db.execute(
            select(LinkCode).where(LinkCode.code_hash == _hash(payload.code))
        )
    ).scalar_one_or_none()

    now = datetime.now(tz=UTC)
    # ⚠ The same ONE refusal as relying-party redeem, for the same reason —
    # and one more way in the same bucket: a code minted for a relying party
    # is not a device code, and saying so would confirm the code is real.
    if (
        row is None
        or row.audience not in audiences
        or row.redeemed_at is not None
        or row.superseded_at is not None
        or row.expires_at_utc <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That code is not valid",
        )

    row.redeemed_at = now
    db.add(row)

    persona = await _first_active_persona(db, row.user_id)

    token = generate_token()
    expires = now + DEVICE_SESSION_LIFETIME
    device_name = payload.device_name.strip()
    db.add(
        SessionRow(
            user_id=row.user_id,
            active_persona_id=persona.id if persona else None,
            token_hash=hash_token(token),
            # ⚠ The active-sessions UI reads user_agent — this is the name
            # the user revokes the device by, so it must say which device.
            user_agent=device_name or f"Linked device ({row.audience})",
            ip_address=None,
            expires_at=expires,
            last_used_at=now,
        )
    )
    db.add(
        AuditEvent(
            kind=AuditEventKind.AUTH,
            action="link_code.redeem_device",
            actor_id=row.user_id,
            outcome=AuditOutcome.SUCCESS,
            # ⚠ Neither the code nor the token — the same rule as mint.
            detail={"audience": row.audience, "device_name": device_name},
        )
    )
    await db.commit()

    return DeviceSessionRead(
        token=token,
        user_id=str(row.user_id),
        display_name=persona.display_name if persona else None,
        audience=row.audience,
        expires_at_utc=expires,
    )
