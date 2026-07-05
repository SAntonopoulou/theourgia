"""WebAuthn ceremony endpoints — Phase 15 hardening.

Supersedes the Phase-02 ``/auth/demo-signin`` shortcut. The four
endpoints here compose into two ceremonies:

  Registration (authenticated user enrols a new authenticator)
    POST /api/v1/auth/webauthn/register/begin   → PublicKeyCredentialCreationOptions
    POST /api/v1/auth/webauthn/register/finish  → 201 + WebauthnCredentialRead

  Authentication (anonymous user proves possession + opens a session)
    POST /api/v1/auth/webauthn/assert/begin     → PublicKeyCredentialRequestOptions
    POST /api/v1/auth/webauthn/assert/finish    → SessionRead (cookie set)

The RP config comes from ``Settings.webauthn_{rp_id,rp_name,origin}``.
When ``webauthn_rp_id`` or ``webauthn_origin`` is unset, every endpoint
returns 503 with the verbatim string ``webauthn not configured``.

Rule 48 sibling — the assertion flow is *discoverable*: no username
input, the authenticator picks the credential (passkey UX). The
browser identifies the user via the credential's ``userHandle`` (which
we set to the user's UUID at registration), not via a form field.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.errors import UnauthorizedError
from theourgia.api.routers.v1.auth import (
    SESSION_COOKIE,
    SESSION_LIFETIME,
    SessionRead,
    _session_to_read,
    _set_cookie,
)
from theourgia.core.auth.challenges import InMemoryChallengeStore
from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.core.auth.webauthn import (
    AllowedCredential,
    ChallengeExpiredError,
    VerificationFailedError,
    WebauthnConfig,
    WebauthnService,
)
from theourgia.core.config import get_settings
from theourgia.models.identity import Session as SessionRow
from theourgia.models.identity import User
from theourgia.models.webauthn import WebauthnCredential

__all__ = ["router", "get_webauthn_service"]


router = APIRouter()


# ── Service singleton ──────────────────────────────────────────────
# The WebAuthn service is stateless; the challenge store is not. We
# share one process-local store so registration challenges issued to
# the browser get consumed by the finish endpoint on the next call.
# In prod (with the redis backend wired) this switches transparently.
_STORE = InMemoryChallengeStore()


def get_webauthn_service() -> WebauthnService:
    settings = get_settings()
    if not settings.webauthn_rp_id or not settings.webauthn_origin:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="webauthn not configured",
        )
    config = WebauthnConfig(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        origin=settings.webauthn_origin,
    )
    return WebauthnService(config, _STORE)


WebauthnDep = Annotated[WebauthnService, Depends(get_webauthn_service)]


# ── Wire shapes ────────────────────────────────────────────────────


class WebauthnCredentialRead(BaseModel):
    """B5 KeyRotation row — never exposes the raw credential_id blob."""

    model_config = ConfigDict(extra="forbid")

    id: str
    nickname: str
    transports: str
    sign_count: int
    created_at: datetime
    last_used_at: datetime | None


class WebauthnCredentialListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credentials: list[WebauthnCredentialRead]


class RegisterFinishInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credential: dict[str, Any]
    nickname: str = Field(default="", max_length=128)


class AssertFinishInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credential: dict[str, Any]


class UpdateCredentialInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(min_length=1, max_length=128)


def _row_to_read(row: WebauthnCredential) -> WebauthnCredentialRead:
    return WebauthnCredentialRead(
        id=str(row.id),
        nickname=row.label or "(unnamed)",
        transports=row.transports_csv,
        sign_count=row.sign_count,
        created_at=row.created_at,
        last_used_at=row.last_used_at,
    )


async def _load_active_credentials_for_user(
    db: AsyncSession,
    user_id: Any,
) -> list[WebauthnCredential]:
    stmt = (
        select(WebauthnCredential)
        .where(
            WebauthnCredential.user_id == user_id,
            WebauthnCredential.revoked_at.is_(None),
        )
        .order_by(WebauthnCredential.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


# ── Registration ceremony ──────────────────────────────────────────


@router.post("/auth/webauthn/register/begin")
async def register_begin(
    user: CurrentUser,
    service: WebauthnDep,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    existing = await _load_active_credentials_for_user(db, user.id)
    exclude = tuple(
        AllowedCredential(credential_id=c.credential_id) for c in existing
    )
    return await service.begin_registration(
        user_id=user.id.bytes,
        user_name=user.email,
        user_display_name=user.email.split("@")[0],
        exclude_credentials=exclude,
    )


@router.post(
    "/auth/webauthn/register/finish",
    response_model=WebauthnCredentialRead,
    status_code=status.HTTP_201_CREATED,
)
async def register_finish(
    payload: RegisterFinishInput,
    user: CurrentUser,
    service: WebauthnDep,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> WebauthnCredentialRead:
    try:
        registered = await service.finish_registration(
            user_id=user.id.bytes,
            response=payload.credential,
        )
    except ChallengeExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="registration challenge expired",
        ) from exc
    except VerificationFailedError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="registration response did not verify",
        ) from exc

    row = WebauthnCredential(
        user_id=user.id,
        credential_id=registered.credential_id,
        public_key=registered.public_key,
        sign_count=registered.sign_count,
        transports_csv=",".join(registered.transports),
        aaguid=registered.aaguid,
        attestation_format=registered.attestation_format,
        credential_device_type=registered.credential_device_type,
        credential_backed_up=registered.credential_backed_up,
        label=payload.nickname.strip() or "New key",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row_to_read(row)


# ── Authentication ceremony ────────────────────────────────────────


@router.post("/auth/webauthn/assert/begin")
async def assert_begin(
    service: WebauthnDep,
) -> dict[str, Any]:
    """Anonymous — issue an assertion challenge.

    Discoverable flow: no allow_credentials list, the authenticator
    picks the credential via the passkey UI. The browser returns the
    user handle we set at registration time so the finish endpoint
    knows which user to sign in.
    """
    # session_id here is a challenge-scoping key; the browser doesn't
    # carry an anonymous session yet. We keep it short and constant —
    # the challenge itself provides the entropy.
    return await service.begin_authentication(session_id="assert")


@router.post("/auth/webauthn/assert/finish", response_model=SessionRead)
async def assert_finish(
    payload: AssertFinishInput,
    response: Response,
    service: WebauthnDep,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionRead:
    credential = payload.credential
    raw_id = credential.get("rawId") or credential.get("id")
    if not raw_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="credential missing rawId",
        )

    # WebAuthn sends the credential id as base64url; convert to bytes.
    from webauthn.helpers import base64url_to_bytes

    try:
        credential_id_bytes = base64url_to_bytes(raw_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="credential id malformed",
        ) from exc

    stored = (
        await db.execute(
            select(WebauthnCredential).where(
                WebauthnCredential.credential_id == credential_id_bytes,
                WebauthnCredential.revoked_at.is_(None),
            )
        )
    ).scalars().first()
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="unknown credential",
        )

    try:
        result = await service.finish_authentication(
            session_id="assert",
            response=credential,
            credential_public_key=stored.public_key,
            credential_current_sign_count=stored.sign_count,
        )
    except ChallengeExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="assertion challenge expired",
        ) from exc
    except VerificationFailedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="assertion did not verify",
        ) from exc

    stored.sign_count = result.new_sign_count
    stored.last_used_at = datetime.now(tz=UTC)

    user = (
        await db.execute(select(User).where(User.id == stored.user_id))
    ).scalars().first()
    if user is None:
        raise UnauthorizedError("credential refers to unknown user")

    now = datetime.now(tz=UTC)
    expires_at = now + SESSION_LIFETIME
    token = generate_token()
    session_row = SessionRow(
        user_id=user.id,
        token_hash=hash_token(token),
        user_agent="",
        ip_address=None,
        expires_at=expires_at,
        last_used_at=now,
    )
    db.add(session_row)
    await db.commit()

    _set_cookie(response, token, expires_at=expires_at)
    await db.refresh(session_row)
    return await _session_to_read(session_row, db)


# ── Credential management (B5 KeyRotation surface) ────────────────


@router.get(
    "/auth/webauthn/credentials",
    response_model=WebauthnCredentialListResponse,
)
async def list_credentials(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> WebauthnCredentialListResponse:
    rows = await _load_active_credentials_for_user(db, user.id)
    return WebauthnCredentialListResponse(
        credentials=[_row_to_read(r) for r in rows],
    )


@router.patch(
    "/auth/webauthn/credentials/{credential_id}",
    response_model=WebauthnCredentialRead,
)
async def update_credential(
    credential_id: str,
    payload: UpdateCredentialInput,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> WebauthnCredentialRead:
    row = (
        await db.execute(
            select(WebauthnCredential).where(
                WebauthnCredential.id == credential_id,
                WebauthnCredential.user_id == user.id,
                WebauthnCredential.revoked_at.is_(None),
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="credential not found",
        )
    row.label = payload.nickname.strip()
    await db.commit()
    await db.refresh(row)
    return _row_to_read(row)


@router.delete(
    "/auth/webauthn/credentials/{credential_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_credential(
    credential_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    row = (
        await db.execute(
            select(WebauthnCredential).where(
                WebauthnCredential.id == credential_id,
                WebauthnCredential.user_id == user.id,
                WebauthnCredential.revoked_at.is_(None),
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="credential not found",
        )
    row.revoked_at = datetime.now(tz=UTC)
    await db.commit()
