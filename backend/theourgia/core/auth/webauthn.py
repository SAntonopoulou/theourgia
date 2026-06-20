"""WebAuthn / passkey support — registration and authentication.

This module wraps `py-webauthn <https://github.com/duo-labs/py_webauthn>`_
(an FSF-friendly MIT-licensed library) and presents a typed Python API
the rest of the codebase consumes. The library handles the heavy lifting
of CBOR parsing, attestation verification, and signature checking; we
own the *flow* — challenge storage, credential persistence, sign-count
tracking, replay protection.

The public surface here is :class:`WebauthnService` with four methods::

    begin_registration(...)   -> options dict (sent to the browser)
    finish_registration(...)  -> RegisteredCredential (persist to DB)
    begin_authentication(...) -> options dict (sent to the browser)
    finish_authentication(...) -> AuthenticationResult (update sign count)

Service construction takes a :class:`WebauthnConfig` (RP id / name /
origin) and a :class:`ChallengeStore` (in-memory for tests, Redis for
production). Persistence is the caller's job — this module reports
*what* to store; the caller decides *where*.

Why not just inline the library calls at the endpoint? Three reasons:

1. **Mockability.** The library reaches over the wire (well, technically
   the library reaches into CBOR + COSE math), and tests want to drive
   the service with canned outputs instead of real keys. Wrapping makes
   the boundary explicit.
2. **Challenge lifecycle.** Issuing and verifying a challenge are
   separate HTTP calls; the store binds them. The wrapper hides this
   from endpoints.
3. **Future portability.** If we ever swap py-webauthn for a different
   library (or write our own), every caller routes through this module
   and the migration becomes a single-file edit.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from theourgia.core.auth.challenges import (
    DEFAULT_CHALLENGE_TTL_SECONDS,
    ChallengeStore,
)

if TYPE_CHECKING:
    # The webauthn library is imported lazily inside the service methods
    # to keep this module importable in tests even when the library is
    # absent. The TYPE_CHECKING guard lets us still write type hints.
    pass


__all__ = [
    "WebauthnConfig",
    "WebauthnError",
    "ChallengeExpiredError",
    "VerificationFailedError",
    "RegisteredCredential",
    "AuthenticationResult",
    "AllowedCredential",
    "WebauthnService",
]


# ── Errors ───────────────────────────────────────────────────────────


class WebauthnError(Exception):
    """Base class for WebAuthn-related failures."""


class ChallengeExpiredError(WebauthnError):
    """The challenge for this ceremony has expired or never existed.

    Surfaces when the client takes too long between begin and finish or
    when an attacker tries to replay a verification with a stale or
    spoofed challenge."""


class VerificationFailedError(WebauthnError):
    """The authenticator's response did not verify.

    May indicate a wrong origin, wrong rp_id, tampered response, bad
    signature, or — most commonly — the user authenticated with the
    wrong device. The underlying library's exception is chained so
    callers can introspect; we don't expose the gory details to the
    end user."""


# ── Data shapes ──────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class WebauthnConfig:
    """Per-instance WebAuthn configuration.

    Attributes:
        rp_id: Relying Party identifier (the registrable domain — e.g.
            ``"theourgia.example.com"``). Used by the authenticator to
            scope credentials; must match the domain serving the web app.
        rp_name: Human-readable RP name shown by some authenticators.
        origin: Expected ``Origin`` header on responses (e.g.
            ``"https://theourgia.example.com"``). For local development
            this is ``"http://localhost:5173"`` or similar.
        challenge_ttl_seconds: How long a challenge remains valid. The
            default (300s) balances usability against replay risk.
    """

    rp_id: str
    rp_name: str
    origin: str
    challenge_ttl_seconds: int = DEFAULT_CHALLENGE_TTL_SECONDS


@dataclass(frozen=True, slots=True)
class RegisteredCredential:
    """Outcome of a successful registration.

    The caller persists this to the database (see
    :class:`theourgia.models.webauthn.WebauthnCredential`). The
    ``credential_id`` is the unique handle the authenticator returns on
    subsequent sign-ins; it must be stored intact (no base64 round-trip
    drift)."""

    credential_id: bytes
    public_key: bytes
    sign_count: int
    aaguid: str | None
    attestation_format: str
    user_verified: bool
    credential_device_type: str
    credential_backed_up: bool
    transports: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class AuthenticationResult:
    """Outcome of a successful authentication.

    The caller updates the credential's stored ``sign_count`` to
    :attr:`new_sign_count` — if the authenticator's reported count goes
    backwards, treat the credential as cloned and reject. Returns
    ``credential_id`` so the caller can find which credential was used
    when ``allow_credentials`` was empty (discoverable / passkey flow)."""

    credential_id: bytes
    new_sign_count: int
    user_verified: bool
    credential_device_type: str
    credential_backed_up: bool


@dataclass(frozen=True, slots=True)
class AllowedCredential:
    """A credential the caller wants the authenticator to use.

    Carries the credential id and optional transports hint. Used by
    :meth:`WebauthnService.begin_authentication` to list which
    credentials the server will accept (the non-discoverable flow); for
    passkey-only sign-in, pass an empty list and let the browser pick."""

    credential_id: bytes
    transports: tuple[str, ...] = field(default_factory=tuple)


# ── Service ──────────────────────────────────────────────────────────


class WebauthnService:
    """High-level orchestrator for WebAuthn ceremonies.

    Instantiate once at app startup with config + challenge store; call
    the four ``begin_*`` / ``finish_*`` methods from API endpoints.

    Threading: the service is stateless; safe to share across requests.
    """

    def __init__(self, config: WebauthnConfig, store: ChallengeStore) -> None:
        self._config = config
        self._store = store

    # ── Registration ─────────────────────────────────────────────────

    async def begin_registration(
        self,
        *,
        user_id: bytes,
        user_name: str,
        user_display_name: str,
        exclude_credentials: tuple[AllowedCredential, ...] = (),
    ) -> dict[str, Any]:
        """Issue registration options for the browser.

        Returns a JSON-ready dict in the
        ``PublicKeyCredentialCreationOptions`` shape the WebAuthn
        browser API consumes. The caller serves this to the front-end
        which passes it to ``navigator.credentials.create()``.
        """
        from webauthn import generate_registration_options, options_to_json
        from webauthn.helpers.structs import (
            AttestationConveyancePreference,
            AuthenticatorSelectionCriteria,
            PublicKeyCredentialDescriptor,
            ResidentKeyRequirement,
            UserVerificationRequirement,
        )

        descriptors = [
            PublicKeyCredentialDescriptor(id=c.credential_id)
            for c in exclude_credentials
        ]

        options = generate_registration_options(
            rp_id=self._config.rp_id,
            rp_name=self._config.rp_name,
            user_id=user_id,
            user_name=user_name,
            user_display_name=user_display_name,
            attestation=AttestationConveyancePreference.NONE,
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.PREFERRED,
                resident_key=ResidentKeyRequirement.PREFERRED,
            ),
            exclude_credentials=descriptors or None,
        )

        await self._store.put(
            self._reg_key(user_id),
            options.challenge,
            self._config.challenge_ttl_seconds,
        )

        # options_to_json returns a JSON string; load back to a dict so
        # FastAPI can re-serialize cleanly with its chosen encoder.
        import json

        return json.loads(options_to_json(options))

    async def finish_registration(
        self,
        *,
        user_id: bytes,
        response: dict[str, Any],
    ) -> RegisteredCredential:
        """Verify a registration response and return persistence data."""
        from webauthn import verify_registration_response

        challenge = await self._store.take(self._reg_key(user_id))
        if challenge is None:
            raise ChallengeExpiredError(
                "registration challenge expired or missing"
            )

        try:
            verification = verify_registration_response(
                credential=response,
                expected_challenge=challenge,
                expected_origin=self._config.origin,
                expected_rp_id=self._config.rp_id,
                require_user_verification=False,
            )
        except Exception as exc:  # noqa: BLE001 — wrap any verifier failure
            raise VerificationFailedError(
                "registration response did not verify"
            ) from exc

        return RegisteredCredential(
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=int(verification.sign_count),
            aaguid=str(verification.aaguid) if verification.aaguid else None,
            attestation_format=str(verification.fmt),
            user_verified=bool(verification.user_verified),
            credential_device_type=str(verification.credential_device_type),
            credential_backed_up=bool(verification.credential_backed_up),
            transports=tuple(response.get("response", {}).get("transports", ()) or ()),
        )

    # ── Authentication ───────────────────────────────────────────────

    async def begin_authentication(
        self,
        *,
        session_id: str,
        allow_credentials: tuple[AllowedCredential, ...] = (),
    ) -> dict[str, Any]:
        """Issue authentication options for the browser.

        Pass an empty ``allow_credentials`` for passkey / discoverable
        flow (the browser picks the credential); pass an explicit list
        when you know which credentials are eligible (post-username
        flow).
        """
        from webauthn import generate_authentication_options, options_to_json
        from webauthn.helpers.structs import (
            PublicKeyCredentialDescriptor,
            UserVerificationRequirement,
        )

        descriptors = [
            PublicKeyCredentialDescriptor(id=c.credential_id)
            for c in allow_credentials
        ]

        options = generate_authentication_options(
            rp_id=self._config.rp_id,
            allow_credentials=descriptors or None,
            user_verification=UserVerificationRequirement.PREFERRED,
        )

        await self._store.put(
            self._auth_key(session_id),
            options.challenge,
            self._config.challenge_ttl_seconds,
        )

        import json

        return json.loads(options_to_json(options))

    async def finish_authentication(
        self,
        *,
        session_id: str,
        response: dict[str, Any],
        credential_public_key: bytes,
        credential_current_sign_count: int,
    ) -> AuthenticationResult:
        """Verify an authentication response.

        Caller has already looked up the credential by id (which the
        browser includes in the response). ``credential_public_key``
        and ``credential_current_sign_count`` come from that stored
        credential. On success, the caller bumps the stored sign count
        to :attr:`AuthenticationResult.new_sign_count`. If the new
        count is **not** strictly greater than the stored one, treat
        the credential as cloned and revoke it.
        """
        from webauthn import verify_authentication_response

        challenge = await self._store.take(self._auth_key(session_id))
        if challenge is None:
            raise ChallengeExpiredError(
                "authentication challenge expired or missing"
            )

        try:
            verification = verify_authentication_response(
                credential=response,
                expected_challenge=challenge,
                expected_origin=self._config.origin,
                expected_rp_id=self._config.rp_id,
                credential_public_key=credential_public_key,
                credential_current_sign_count=credential_current_sign_count,
                require_user_verification=False,
            )
        except Exception as exc:  # noqa: BLE001
            raise VerificationFailedError(
                "authentication response did not verify"
            ) from exc

        new_count = int(verification.new_sign_count)
        # Sign-count regression check. The spec says a non-zero stored
        # count combined with a non-strictly-increasing new count
        # indicates a possibly cloned authenticator; we surface this as
        # a verification failure for the caller to act on.
        if credential_current_sign_count > 0 and new_count <= credential_current_sign_count:
            raise VerificationFailedError(
                "authenticator sign count did not increase — possible clone"
            )

        return AuthenticationResult(
            credential_id=bytes(verification.credential_id),
            new_sign_count=new_count,
            user_verified=bool(verification.user_verified),
            credential_device_type=str(verification.credential_device_type),
            credential_backed_up=bool(verification.credential_backed_up),
        )

    # ── Helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _reg_key(user_id: bytes) -> str:
        return f"reg:{user_id.hex()}"

    @staticmethod
    def _auth_key(session_id: str) -> str:
        return f"auth:{session_id}"
