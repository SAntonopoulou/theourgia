"""Unit tests for the media upload pipeline router (B133).

Pure-unit coverage (no DB, no FastAPI app). The DB-touching paths
are exercised at the helper / schema / routing level here; full
end-to-end coverage lands when the integration harness comes
online (Phase 15).

THE critical honesty rules covered:

  * Sealed + EXIF strip is REJECTED at begin time (the route's
    explicit 400 — encrypted bytes can't be re-stripped server-
    side).
  * EXIF strip default is ON for unsealed image uploads when the
    caller omits the policy. Sealed or non-image uploads get None.
  * Quota check uses the documented 5 GB default.
  * NO `/refund`-style server retry endpoints — once a session is
    COMPLETED it's frozen forever.
"""

from __future__ import annotations

import inspect
from datetime import datetime, timezone

import pytest
from fastapi.routing import APIRoute
from pydantic import ValidationError

from theourgia.api.routers.v1 import media_uploads as uploads_module
from theourgia.api.routers.v1.media_uploads import (
    DEFAULT_QUOTA_BYTES,
    DEFAULT_SESSION_TTL,
    BeginUploadPayload,
    BeginUploadResponse,
    CompleteUploadPayload,
    CompleteUploadResponse,
    StorageAdapter,
    _effective_exif_policy,
    _new_object_key,
)
from theourgia.models.media import ExifPolicy, MediaKind
from theourgia.models.media_upload_session import (
    MediaUploadSession,
    MediaUploadSessionStatus,
)


# ── Constants ─────────────────────────────────────────────────────


def test_default_quota_is_five_gigabytes() -> None:
    """The plan locks 5 GB as the per-vault default. A future
    commit that tweaks the literal triggers this test."""
    assert DEFAULT_QUOTA_BYTES == 5 * 1024 * 1024 * 1024


def test_default_session_ttl_is_24h() -> None:
    """Sessions are short-lived per the plan."""
    assert DEFAULT_SESSION_TTL.total_seconds() == 24 * 3600


# ── Schema invariants ─────────────────────────────────────────────


def test_begin_payload_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        BeginUploadPayload(
            kind=MediaKind.IMAGE,
            filename="a.jpg",
            size_bytes=1,
            mime_type="image/jpeg",
            sneaky_unknown=True,
        )


def test_begin_payload_rejects_negative_size() -> None:
    with pytest.raises(ValidationError):
        BeginUploadPayload(
            kind=MediaKind.IMAGE,
            filename="a.jpg",
            size_bytes=-1,
            mime_type="image/jpeg",
        )


def test_begin_payload_rejects_empty_filename() -> None:
    with pytest.raises(ValidationError):
        BeginUploadPayload(
            kind=MediaKind.IMAGE,
            filename="",
            size_bytes=1,
            mime_type="image/jpeg",
        )


def test_begin_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        BeginUploadResponse(
            upload_id="x",
            r2_object_key="k",
            presigned_put_url="https://r2/...",
            expires_at=datetime.now(tz=timezone.utc),
            effective_exif_policy=None,
            sneaky_unknown=True,
        )


def test_complete_payload_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        CompleteUploadPayload(sneaky_unknown=True)


def test_complete_payload_rejects_negative_width() -> None:
    with pytest.raises(ValidationError):
        CompleteUploadPayload(width_px=-1)


def test_complete_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        CompleteUploadResponse(
            media_asset_id="x",
            upload_id="y",
            sealed=False,
            exif_stripped=False,
            pre_strip_size=0,
            post_strip_size=0,
            strip_reason="",
            sneaky_unknown=True,
        )


# ── _effective_exif_policy (the EXIF default-on rule) ────────────


def test_effective_exif_policy_unsealed_image_defaults_stripped() -> None:
    """The H07 Upload modal default: strip on for unsealed images."""
    p = BeginUploadPayload(
        kind=MediaKind.IMAGE,
        filename="a.jpg",
        size_bytes=1,
        mime_type="image/jpeg",
        sealed=False,
    )
    assert _effective_exif_policy(p) == ExifPolicy.STRIPPED


def test_effective_exif_policy_sealed_image_defaults_none() -> None:
    """Sealed uploads can't be stripped server-side."""
    p = BeginUploadPayload(
        kind=MediaKind.IMAGE,
        filename="a.jpg",
        size_bytes=1,
        mime_type="image/jpeg",
        sealed=True,
    )
    assert _effective_exif_policy(p) is None


def test_effective_exif_policy_audio_defaults_none() -> None:
    """Non-image uploads default to no policy — they have no EXIF."""
    p = BeginUploadPayload(
        kind=MediaKind.AUDIO,
        filename="a.mp3",
        size_bytes=1,
        mime_type="audio/mpeg",
    )
    assert _effective_exif_policy(p) is None


def test_effective_exif_policy_caller_choice_is_respected_retained() -> None:
    """If the caller explicitly sets RETAINED, we don't override."""
    p = BeginUploadPayload(
        kind=MediaKind.IMAGE,
        filename="a.jpg",
        size_bytes=1,
        mime_type="image/jpeg",
        exif_policy=ExifPolicy.RETAINED,
    )
    assert _effective_exif_policy(p) == ExifPolicy.RETAINED


def test_effective_exif_policy_caller_choice_is_respected_stripped() -> None:
    p = BeginUploadPayload(
        kind=MediaKind.AUDIO,
        filename="a.mp3",
        size_bytes=1,
        mime_type="audio/mpeg",
        exif_policy=ExifPolicy.STRIPPED,
    )
    assert _effective_exif_policy(p) == ExifPolicy.STRIPPED


# ── _new_object_key ──────────────────────────────────────────────


def test_new_object_key_includes_owner_prefix() -> None:
    from uuid import uuid4

    owner = uuid4()
    key = _new_object_key(owner, "altar.jpg")
    assert f"vault/{owner}/" in key
    assert key.endswith("/altar.jpg")


def test_new_object_key_has_a_unique_handle() -> None:
    from uuid import uuid4

    owner = uuid4()
    keys = {_new_object_key(owner, "a.jpg") for _ in range(20)}
    assert len(keys) == 20  # entropy → all unique


# ── Session model ────────────────────────────────────────────────


def test_session_status_enum_values() -> None:
    assert {s.value for s in MediaUploadSessionStatus} == {
        "pending", "completed", "cancelled", "expired",
    }


def test_session_carries_media_asset_id_field() -> None:
    assert "media_asset_id" in MediaUploadSession.model_fields


def test_session_carries_expires_at_field() -> None:
    assert "expires_at" in MediaUploadSession.model_fields


def test_session_carries_r2_object_key_field() -> None:
    assert "r2_object_key" in MediaUploadSession.model_fields


def test_session_carries_sealed_field() -> None:
    assert "sealed" in MediaUploadSession.model_fields


# ── Router registration ─────────────────────────────────────────


def _paths_methods() -> set[tuple[str, str]]:
    return {
        (r.path, m)
        for r in uploads_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }


def test_router_registers_begin() -> None:
    assert ("/media/uploads/begin", "POST") in _paths_methods()


def test_router_registers_complete() -> None:
    assert (
        ("/media/uploads/{upload_id}/complete", "POST") in _paths_methods()
    )


def test_router_registers_cancel() -> None:
    assert (
        ("/media/uploads/{upload_id}", "DELETE") in _paths_methods()
    )


def test_router_has_no_refund_or_retry_endpoint() -> None:
    """Defensive: a future commit that adds a "/retry" or "/refund"
    or similar magic-button-style endpoint gets caught. Each upload
    is its own session — to retry, the caller starts a new
    /uploads/begin."""
    paths = {p for (p, _) in _paths_methods()}
    banned = {"retry", "refund", "force-complete", "skip-strip"}
    for path in paths:
        for token in banned:
            assert token not in path, (
                f"banned token {token!r} appeared in upload route "
                f"{path!r}"
            )


# ── Response-model wiring ────────────────────────────────────────


def test_begin_route_uses_begin_response_model() -> None:
    for r in uploads_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/media/uploads/begin"
        ):
            assert r.response_model is BeginUploadResponse
            return
    raise AssertionError("begin route missing")


def test_complete_route_uses_complete_response_model() -> None:
    for r in uploads_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/media/uploads/{upload_id}/complete"
        ):
            assert r.response_model is CompleteUploadResponse
            return
    raise AssertionError("complete route missing")


# ── Source-level honesty invariants ──────────────────────────────


def test_sealed_strip_rejection_lives_in_begin_source() -> None:
    """The "sealed + strip = 400" rule MUST be in the begin source.
    A future commit that quietly removes the check gets caught."""
    src = inspect.getsource(uploads_module.begin_upload)
    assert "sealed" in src
    assert "ExifPolicy.STRIPPED" in src or "STRIPPED" in src
    assert "400" in src or "HTTP_400_BAD_REQUEST" in src


def test_quota_check_lives_in_begin_source() -> None:
    """The quota guard MUST be in the begin source. The literal
    DEFAULT_QUOTA_BYTES must be referenced."""
    src = inspect.getsource(uploads_module.begin_upload)
    assert "DEFAULT_QUOTA_BYTES" in src


def test_completed_session_is_frozen_in_cancel_source() -> None:
    """Once COMPLETED, the cancel endpoint returns 409. The plan
    locks this — a completed upload's R2 object is referenced by a
    MediaAsset row; cancelling would orphan it."""
    src = inspect.getsource(uploads_module.cancel_upload)
    assert "COMPLETED" in src
    assert "409" in src or "HTTP_409_CONFLICT" in src


def test_storage_adapter_has_all_six_callables() -> None:
    """The injection seam — a future contributor adding e.g.
    move() or copy() should think twice; we want the minimum
    surface area."""
    fields = {f.name for f in StorageAdapter.__dataclass_fields__.values()}
    expected = {
        "presigned_put_url",
        "exists",
        "stat",
        "get",
        "put",
        "delete",
    }
    assert fields == expected


def test_no_play_count_in_uploads_source() -> None:
    """Carry the B132 anti-gamification rule forward to uploads."""
    src = inspect.getsource(uploads_module)
    assert "play_count" not in src.lower()
    assert "playcount" not in src.lower()


def test_no_view_count_in_uploads_source() -> None:
    src = inspect.getsource(uploads_module)
    assert "view_count" not in src.lower()
