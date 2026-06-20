"""Tests for the WebAuthn service wrapper.

We don't run the underlying py-webauthn library against real
authenticators here (that would require either a hardware key or a
virtual one + browser harness — better fit for end-to-end tests later).
Instead we test the *wrapper's* behavior: challenge lifecycle, error
mapping, sign-count regression, data-shape forwarding. The library
functions themselves are stubbed via :mod:`sys.modules`.
"""

from __future__ import annotations

import sys
import types
from typing import Any

import pytest

from theourgia.core.auth.challenges import InMemoryChallengeStore
from theourgia.core.auth.webauthn import (
    AllowedCredential,
    AuthenticationResult,
    ChallengeExpiredError,
    RegisteredCredential,
    VerificationFailedError,
    WebauthnConfig,
    WebauthnService,
)


# ── Stub py-webauthn ────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _install_fake_webauthn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Inject a fake ``webauthn`` package so the service's lazy imports
    resolve without the real library installed."""

    fake_webauthn = types.ModuleType("webauthn")
    fake_helpers = types.ModuleType("webauthn.helpers")
    fake_structs = types.ModuleType("webauthn.helpers.structs")

    # Enums / classes the service references
    class _AttestationConveyancePreference:
        NONE = "none"

    class _UserVerificationRequirement:
        PREFERRED = "preferred"

    class _ResidentKeyRequirement:
        PREFERRED = "preferred"

    class _AuthenticatorSelectionCriteria:
        def __init__(self, **kwargs: Any) -> None:
            self.kwargs = kwargs

    class _PublicKeyCredentialDescriptor:
        def __init__(self, id: bytes) -> None:
            self.id = id

    fake_structs.AttestationConveyancePreference = _AttestationConveyancePreference  # type: ignore[attr-defined]
    fake_structs.UserVerificationRequirement = _UserVerificationRequirement  # type: ignore[attr-defined]
    fake_structs.ResidentKeyRequirement = _ResidentKeyRequirement  # type: ignore[attr-defined]
    fake_structs.AuthenticatorSelectionCriteria = _AuthenticatorSelectionCriteria  # type: ignore[attr-defined]
    fake_structs.PublicKeyCredentialDescriptor = _PublicKeyCredentialDescriptor  # type: ignore[attr-defined]

    # Generators
    class _Opts:
        def __init__(self, challenge: bytes) -> None:
            self.challenge = challenge

    def fake_generate_registration_options(**kwargs: Any) -> _Opts:
        return _Opts(challenge=b"fixed-registration-challenge")

    def fake_generate_authentication_options(**kwargs: Any) -> _Opts:
        return _Opts(challenge=b"fixed-authentication-challenge")

    def fake_options_to_json(opts: _Opts) -> str:
        import base64
        import json

        return json.dumps(
            {
                "challenge": base64.urlsafe_b64encode(opts.challenge).decode().rstrip("="),
            }
        )

    # Verifiers — return objects with the attributes the wrapper reads
    class _VerifiedRegistration:
        def __init__(self) -> None:
            self.credential_id = b"cred-id-bytes"
            self.credential_public_key = b"public-key-bytes"
            self.sign_count = 0
            self.aaguid = "00000000-0000-0000-0000-000000000000"
            self.fmt = "none"
            self.user_verified = True
            self.credential_device_type = "single_device"
            self.credential_backed_up = False

    class _VerifiedAuthentication:
        def __init__(self, new_count: int) -> None:
            self.credential_id = b"cred-id-bytes"
            self.new_sign_count = new_count
            self.user_verified = True
            self.credential_device_type = "single_device"
            self.credential_backed_up = False

    fake_webauthn._VerifiedRegistration = _VerifiedRegistration  # type: ignore[attr-defined]
    fake_webauthn._VerifiedAuthentication = _VerifiedAuthentication  # type: ignore[attr-defined]

    fake_webauthn.generate_registration_options = fake_generate_registration_options  # type: ignore[attr-defined]
    fake_webauthn.generate_authentication_options = fake_generate_authentication_options  # type: ignore[attr-defined]
    fake_webauthn.options_to_json = fake_options_to_json  # type: ignore[attr-defined]

    # Default verify functions — tests override via monkeypatch.setattr
    def fake_verify_registration_response(**kwargs: Any) -> _VerifiedRegistration:
        return _VerifiedRegistration()

    def fake_verify_authentication_response(**kwargs: Any) -> _VerifiedAuthentication:
        return _VerifiedAuthentication(new_count=42)

    fake_webauthn.verify_registration_response = fake_verify_registration_response  # type: ignore[attr-defined]
    fake_webauthn.verify_authentication_response = fake_verify_authentication_response  # type: ignore[attr-defined]

    monkeypatch.setitem(sys.modules, "webauthn", fake_webauthn)
    monkeypatch.setitem(sys.modules, "webauthn.helpers", fake_helpers)
    monkeypatch.setitem(sys.modules, "webauthn.helpers.structs", fake_structs)


@pytest.fixture
def service() -> WebauthnService:
    return WebauthnService(
        config=WebauthnConfig(
            rp_id="example.com",
            rp_name="Example",
            origin="https://example.com",
        ),
        store=InMemoryChallengeStore(),
    )


# ── Registration ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_begin_registration_returns_options_dict(
    service: WebauthnService,
) -> None:
    opts = await service.begin_registration(
        user_id=b"\x01" * 16,
        user_name="alice@example.com",
        user_display_name="Alice",
    )
    assert isinstance(opts, dict)
    assert "challenge" in opts


@pytest.mark.asyncio
async def test_begin_registration_stores_challenge(
    service: WebauthnService,
) -> None:
    user_id = b"\x02" * 16
    await service.begin_registration(
        user_id=user_id,
        user_name="alice@example.com",
        user_display_name="Alice",
    )
    # Challenge should be retrievable from the store under the
    # service's key scheme
    store = service._store  # type: ignore[attr-defined]
    key = WebauthnService._reg_key(user_id)
    challenge = await store.take(key)
    assert challenge == b"fixed-registration-challenge"


@pytest.mark.asyncio
async def test_finish_registration_returns_credential(
    service: WebauthnService,
) -> None:
    user_id = b"\x03" * 16
    await service.begin_registration(
        user_id=user_id,
        user_name="alice@example.com",
        user_display_name="Alice",
    )
    result = await service.finish_registration(
        user_id=user_id,
        response={"id": "cred", "response": {"transports": ["usb"]}},
    )
    assert isinstance(result, RegisteredCredential)
    assert result.credential_id == b"cred-id-bytes"
    assert result.public_key == b"public-key-bytes"
    assert result.attestation_format == "none"
    assert result.transports == ("usb",)


@pytest.mark.asyncio
async def test_finish_registration_without_begin_raises_expired(
    service: WebauthnService,
) -> None:
    with pytest.raises(ChallengeExpiredError):
        await service.finish_registration(
            user_id=b"\x04" * 16,
            response={"id": "x", "response": {}},
        )


@pytest.mark.asyncio
async def test_finish_registration_is_single_use(
    service: WebauthnService,
) -> None:
    """A successful verification consumes the challenge; a second
    finish_registration without a new begin must fail."""
    user_id = b"\x05" * 16
    await service.begin_registration(
        user_id=user_id,
        user_name="alice@example.com",
        user_display_name="Alice",
    )
    await service.finish_registration(
        user_id=user_id, response={"id": "x", "response": {}}
    )
    with pytest.raises(ChallengeExpiredError):
        await service.finish_registration(
            user_id=user_id, response={"id": "x", "response": {}}
        )


@pytest.mark.asyncio
async def test_finish_registration_wraps_library_errors(
    service: WebauthnService, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When the underlying library raises, we surface
    VerificationFailedError (not the raw exception type)."""
    import webauthn

    def boom(**kwargs: Any) -> Any:
        raise RuntimeError("internal verification failure")

    monkeypatch.setattr(webauthn, "verify_registration_response", boom)

    user_id = b"\x06" * 16
    await service.begin_registration(
        user_id=user_id,
        user_name="alice@example.com",
        user_display_name="Alice",
    )
    with pytest.raises(VerificationFailedError):
        await service.finish_registration(
            user_id=user_id, response={"id": "x", "response": {}}
        )


# ── Authentication ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_begin_authentication_returns_options_dict(
    service: WebauthnService,
) -> None:
    opts = await service.begin_authentication(
        session_id="sess-1",
        allow_credentials=(
            AllowedCredential(credential_id=b"cred-id-bytes"),
        ),
    )
    assert isinstance(opts, dict)
    assert "challenge" in opts


@pytest.mark.asyncio
async def test_finish_authentication_returns_result(
    service: WebauthnService,
) -> None:
    await service.begin_authentication(session_id="sess-2")
    result = await service.finish_authentication(
        session_id="sess-2",
        response={"id": "cred"},
        credential_public_key=b"pub",
        credential_current_sign_count=10,
    )
    assert isinstance(result, AuthenticationResult)
    assert result.new_sign_count == 42  # from the fake
    assert result.credential_id == b"cred-id-bytes"


@pytest.mark.asyncio
async def test_finish_authentication_rejects_regressing_sign_count(
    service: WebauthnService, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the authenticator reports a sign count <= what we have stored,
    treat as a possible clone — raise VerificationFailedError."""
    import webauthn

    class _RegressedVerification:
        credential_id = b"cred-id-bytes"
        new_sign_count = 5
        user_verified = True
        credential_device_type = "single_device"
        credential_backed_up = False

    monkeypatch.setattr(
        webauthn,
        "verify_authentication_response",
        lambda **kwargs: _RegressedVerification(),
    )

    await service.begin_authentication(session_id="sess-3")
    with pytest.raises(VerificationFailedError, match="clone"):
        await service.finish_authentication(
            session_id="sess-3",
            response={"id": "cred"},
            credential_public_key=b"pub",
            credential_current_sign_count=10,
        )


@pytest.mark.asyncio
async def test_finish_authentication_accepts_zero_sign_count_history(
    service: WebauthnService, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Some authenticators always report sign_count=0. If our stored
    count is also 0, that's not a regression — accept the auth."""
    import webauthn

    class _ZeroCount:
        credential_id = b"cred-id-bytes"
        new_sign_count = 0
        user_verified = True
        credential_device_type = "single_device"
        credential_backed_up = False

    monkeypatch.setattr(
        webauthn,
        "verify_authentication_response",
        lambda **kwargs: _ZeroCount(),
    )

    await service.begin_authentication(session_id="sess-4")
    result = await service.finish_authentication(
        session_id="sess-4",
        response={"id": "cred"},
        credential_public_key=b"pub",
        credential_current_sign_count=0,
    )
    assert result.new_sign_count == 0


@pytest.mark.asyncio
async def test_finish_authentication_without_begin_raises_expired(
    service: WebauthnService,
) -> None:
    with pytest.raises(ChallengeExpiredError):
        await service.finish_authentication(
            session_id="never-began",
            response={"id": "cred"},
            credential_public_key=b"pub",
            credential_current_sign_count=10,
        )


@pytest.mark.asyncio
async def test_registration_and_authentication_use_distinct_namespaces(
    service: WebauthnService,
) -> None:
    """A registration challenge for user X must not be takeable as an
    authentication challenge for session X — distinct key prefixes."""
    user_id = b"\x07" * 16
    await service.begin_registration(
        user_id=user_id,
        user_name="alice",
        user_display_name="Alice",
    )
    # An authentication finish using the same identifier as a "session"
    # must not find the registration challenge.
    with pytest.raises(ChallengeExpiredError):
        await service.finish_authentication(
            session_id=user_id.hex(),
            response={"id": "cred"},
            credential_public_key=b"pub",
            credential_current_sign_count=0,
        )
