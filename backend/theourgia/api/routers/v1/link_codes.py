"""Device link codes — link a companion app's account to a theourgia one.

::

  POST /api/v1/link-codes           mint a code (the signed-in user)
  POST /api/v1/link-codes/redeem    spend one (a registered relying party)

The reasoning for the whole mechanism is in :mod:`theourgia.models.link_code`.
The short version: a phone cannot hold a theourgia session token without either
an embedded login form or a full OAuth implementation, so the user reads eight
characters here and types them there, and the relying party's *server* — not
the user's device — exchanges them for an identity.

## ⚠ What redeem returns, and what it does not

The user's id, their display name, and the audience. **Not** their email, not
their vaults, not a session. A relying party learns "this is user X here", which
is the entire question it asked, and gets no ability to act as them.

## ⚠ Both endpoints fail closed when nothing is configured

No configured clients means 503 on redeem and 503 on mint. A code nobody can
redeem is not worth showing a user, and a redeem endpoint that accepts requests
on a deployment with no relying parties is a surface with no purpose.
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
from theourgia.core.config import get_settings
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.link_code import LinkCode
from theourgia.models.persona import Persona

__all__ = ["router"]


router = APIRouter()


CODE_TTL = timedelta(minutes=10)
"""Long enough to walk from a browser to a phone, short enough that a code
left on a screen is not a standing credential."""

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
    if audience not in _configured_clients():
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

    persona = (
        await db.execute(
            select(Persona)
            .where(Persona.user_id == row.user_id, Persona.is_active.is_(True))
            .order_by(Persona.kind, Persona.created_at)
        )
    ).scalars().first()

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
