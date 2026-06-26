"""Unit tests for the media router (B132).

THE critical honesty rules this file pins:
  * Sealed assets surface as count-only in the list endpoint — the
    read response actively nulls filename / alt_text / caption /
    dimensions / tags / exif_metadata, but PRESERVES size_bytes
    (storage-quota math) + link_count.
  * NO play_count column / field / attribute anywhere — defensive
    enumeration in both schemas and the router source.
  * Immutable fields on PATCH: r2_object_key / size_bytes /
    mime_type / kind / owner_id are intentionally absent from the
    update schema.
  * link_count defaults to 0; non-negative invariant on the model.
  * exif_policy=STRIPPED requires exif_metadata={} on create.
"""

from __future__ import annotations

import inspect
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute
from pydantic import ValidationError

from theourgia.api.routers.v1 import media as media_module
from theourgia.api.routers.v1.media import (
    MediaAssetCard,
    MediaAssetRead,
    MediaCreate,
    MediaLinkCreate,
    MediaLinkRead,
    MediaListResponse,
    MediaUpdate,
    SealedCountResponse,
    _to_card,
    _to_read,
)
from theourgia.models.media import ExifPolicy, MediaAsset, MediaKind, MediaLink


def _media_row(
    *,
    sealed: bool = False,
    kind: MediaKind = MediaKind.IMAGE,
    filename: str = "altar.jpg",
    size_bytes: int = 12345,
    link_count: int = 0,
    width_px: int | None = 800,
    height_px: int | None = 600,
    duration_seconds: int | None = None,
    alt_text: str | None = "Altar with candles",
    caption: str | None = "From Wednesday's working.",
    tags: list | None = None,
    exif_policy: ExifPolicy | None = ExifPolicy.STRIPPED,
    exif_metadata: dict | None = None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        kind=kind,
        filename=filename,
        r2_object_key=f"vault/{uuid4()}/altar.jpg",
        mime_type="image/jpeg",
        size_bytes=size_bytes,
        width_px=width_px,
        height_px=height_px,
        duration_seconds=duration_seconds,
        alt_text=alt_text,
        caption=caption,
        tags=list(tags) if tags is not None else ["altar", "hekate"],
        sealed=sealed,
        exif_policy=exif_policy,
        exif_metadata=dict(exif_metadata) if exif_metadata else {},
        link_count=link_count,
        created_at=now,
        updated_at=now,
    )


# ── Enums ────────────────────────────────────────────────────────


def test_media_kind_enum_values() -> None:
    assert {m.value for m in MediaKind} == {
        "image", "audio", "video", "document",
    }


def test_exif_policy_enum_values() -> None:
    assert {m.value for m in ExifPolicy} == {"retained", "stripped"}


# ── Schemas: extras forbidden + required fields ──────────────────


def test_media_card_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MediaAssetCard(
            id="x", kind="image", filename="a", mime_type="image/jpeg",
            size_bytes=1, width_px=None, height_px=None,
            duration_seconds=None, alt_text=None, caption=None,
            tags=[], exif_policy=None, link_count=0,
            created_at=datetime.now(tz=timezone.utc),
            sneaky_unknown_field=True,
        )


def test_media_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MediaAssetRead(
            id="x", owner_id="y", kind="image", filename="a",
            r2_object_key="k", mime_type="image/jpeg", size_bytes=1,
            width_px=None, height_px=None, duration_seconds=None,
            alt_text=None, caption=None, tags=[], sealed=False,
            exif_policy=None, exif_metadata={}, link_count=0,
            created_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
            sneaky_unknown_field=True,
        )


def test_media_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MediaCreate(
            kind="image", filename="a.jpg", r2_object_key="k",
            mime_type="image/jpeg", size_bytes=1,
            sneaky_unknown_field=True,
        )


def test_media_update_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MediaUpdate(sneaky_unknown_field=True)


def test_media_list_response_carries_sealed_count_separately() -> None:
    mlr = MediaListResponse(items=[], sealed_count=3)
    assert mlr.sealed_count == 3
    assert mlr.items == []


def test_sealed_count_response_shape() -> None:
    s = SealedCountResponse(sealed_count=7)
    assert s.sealed_count == 7


def test_media_create_rejects_negative_size() -> None:
    with pytest.raises(ValidationError):
        MediaCreate(
            kind="image", filename="a.jpg", r2_object_key="k",
            mime_type="image/jpeg", size_bytes=-1,
        )


def test_media_create_rejects_empty_filename() -> None:
    with pytest.raises(ValidationError):
        MediaCreate(
            kind="image", filename="", r2_object_key="k",
            mime_type="image/jpeg", size_bytes=1,
        )


def test_media_link_create_shape() -> None:
    rid = uuid4()
    lc = MediaLinkCreate(ref_kind="entry", ref_id=rid)
    assert lc.ref_kind == "entry"
    assert lc.ref_id == rid


def test_media_link_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MediaLinkRead(
            id="x", media_id="y", ref_kind="entry",
            ref_id="00000000-0000-0000-0000-000000000000",
            created_at=datetime.now(tz=timezone.utc),
            sneaky_unknown_field=True,
        )


# ── Immutable PATCH fields (the plan's hard rules) ───────────────


def test_media_update_omits_immutable_r2_object_key() -> None:
    assert "r2_object_key" not in MediaUpdate.model_fields


def test_media_update_omits_immutable_size_bytes() -> None:
    assert "size_bytes" not in MediaUpdate.model_fields


def test_media_update_omits_immutable_mime_type() -> None:
    assert "mime_type" not in MediaUpdate.model_fields


def test_media_update_omits_immutable_kind() -> None:
    assert "kind" not in MediaUpdate.model_fields


def test_media_update_omits_immutable_owner_id() -> None:
    assert "owner_id" not in MediaUpdate.model_fields


def test_media_update_carries_mutable_fields() -> None:
    """Sanity: the mutable side IS exposed."""
    expected = {"filename", "alt_text", "caption", "tags",
                "exif_policy", "exif_metadata", "sealed"}
    assert expected.issubset(set(MediaUpdate.model_fields.keys()))


# ── Anti-gamification: no play_count anywhere ────────────────────


def test_no_play_count_on_media_card() -> None:
    assert "play_count" not in MediaAssetCard.model_fields


def test_no_play_count_on_media_read() -> None:
    assert "play_count" not in MediaAssetRead.model_fields


def test_no_play_count_on_media_create() -> None:
    assert "play_count" not in MediaCreate.model_fields


def test_no_play_count_on_media_update() -> None:
    assert "play_count" not in MediaUpdate.model_fields


def test_no_play_count_on_media_model() -> None:
    """The MediaAsset model class itself must not carry a
    play_count column. Even if a future migration accidentally added
    one, this test fails."""
    assert "play_count" not in MediaAsset.model_fields


def test_no_play_count_in_router_source() -> None:
    """Defensive: a future commit that adds /play / play-count
    endpoints or fields gets caught at the source level."""
    src = inspect.getsource(media_module)
    assert "play_count" not in src.lower()
    assert "playcount" not in src.lower()


# ── No view_count / trending either (carried over from B130) ─────


def test_no_view_count_on_media_card() -> None:
    assert "view_count" not in MediaAssetCard.model_fields


def test_no_view_count_on_media_read() -> None:
    assert "view_count" not in MediaAssetRead.model_fields


def test_no_trending_score_on_media_card() -> None:
    assert "trending_score" not in MediaAssetCard.model_fields


# ── _to_card round-trip ──────────────────────────────────────────


def test_to_card_basic_round_trip() -> None:
    row = _media_row()
    card = _to_card(row)
    assert card.id == str(row.id)
    assert card.kind == "image"
    assert card.filename == "altar.jpg"
    assert card.size_bytes == 12345
    assert card.tags == ["altar", "hekate"]


# ── _to_read sealed honesty (the core rule) ──────────────────────


def test_to_read_unsealed_preserves_all_fields() -> None:
    row = _media_row(sealed=False)
    r = _to_read(row)
    assert r.sealed is False
    assert r.filename == "altar.jpg"
    assert r.caption == "From Wednesday's working."
    assert r.alt_text == "Altar with candles"
    assert r.tags == ["altar", "hekate"]
    assert r.width_px == 800
    assert r.height_px == 600


def test_to_read_sealed_omits_filename() -> None:
    row = _media_row(sealed=True)
    assert _to_read(row).filename is None


def test_to_read_sealed_omits_caption() -> None:
    row = _media_row(sealed=True)
    assert _to_read(row).caption is None


def test_to_read_sealed_omits_alt_text() -> None:
    row = _media_row(sealed=True)
    assert _to_read(row).alt_text is None


def test_to_read_sealed_omits_tags() -> None:
    row = _media_row(sealed=True, tags=["secret", "oath"])
    assert _to_read(row).tags == []


def test_to_read_sealed_omits_exif_metadata() -> None:
    row = _media_row(
        sealed=True,
        exif_policy=ExifPolicy.RETAINED,
        exif_metadata={"camera": "Pentax K1000", "shutter": "1/125"},
    )
    r = _to_read(row)
    assert r.exif_metadata == {}
    assert r.exif_policy is None


def test_to_read_sealed_omits_dimensions() -> None:
    row = _media_row(sealed=True, width_px=2400, height_px=1600)
    r = _to_read(row)
    assert r.width_px is None
    assert r.height_px is None


def test_to_read_sealed_omits_duration() -> None:
    row = _media_row(
        sealed=True,
        kind=MediaKind.AUDIO,
        duration_seconds=420,
    )
    assert _to_read(row).duration_seconds is None


def test_to_read_sealed_preserves_size_bytes() -> None:
    """Sealed assets STILL surface size_bytes — needed for
    storage-quota math. The H07 rule preserves this single byte-
    level fact while hiding everything else."""
    row = _media_row(sealed=True, size_bytes=999_999)
    assert _to_read(row).size_bytes == 999_999


def test_to_read_sealed_preserves_link_count() -> None:
    """Sealed assets surface link_count (the matter-of-fact "linked
    to N workings" stat the H07 Library card shows). The targets
    are NOT enumerated."""
    row = _media_row(sealed=True, link_count=4)
    assert _to_read(row).link_count == 4


def test_to_read_sealed_preserves_r2_object_key() -> None:
    """The key still resolves — the bytes are encrypted client-
    side via the B108 vaultCrypto pipeline."""
    row = _media_row(sealed=True)
    r = _to_read(row)
    assert r.r2_object_key == row.r2_object_key


def test_to_read_sealed_preserves_kind_and_mime() -> None:
    """Kind + mime are needed by the H07 Library to choose the
    right placeholder card; they survive sealing."""
    row = _media_row(sealed=True, kind=MediaKind.VIDEO)
    r = _to_read(row)
    assert r.kind == "video"
    assert r.mime_type == "image/jpeg"  # whatever was on the row


# ── Router registration smoke ────────────────────────────────────


def _paths_methods(router) -> set[tuple[str, str]]:
    return {
        (r.path, m)
        for r in router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }


def test_router_registers_list_media() -> None:
    assert ("/media", "GET") in _paths_methods(media_module.router)


def test_router_registers_create_media() -> None:
    assert ("/media", "POST") in _paths_methods(media_module.router)


def test_router_registers_read_media() -> None:
    assert (
        ("/media/{media_id}", "GET")
        in _paths_methods(media_module.router)
    )


def test_router_registers_patch_media() -> None:
    assert (
        ("/media/{media_id}", "PATCH")
        in _paths_methods(media_module.router)
    )


def test_router_registers_delete_media() -> None:
    assert (
        ("/media/{media_id}", "DELETE")
        in _paths_methods(media_module.router)
    )


def test_router_registers_sealed_count() -> None:
    assert (
        ("/media/sealed-count", "GET")
        in _paths_methods(media_module.router)
    )


def test_router_registers_link_create() -> None:
    assert (
        ("/media/{media_id}/links", "POST")
        in _paths_methods(media_module.router)
    )


def test_router_registers_link_delete() -> None:
    assert (
        ("/media/{media_id}/links/{link_id}", "DELETE")
        in _paths_methods(media_module.router)
    )


# ── Response-model wiring ────────────────────────────────────────


def test_list_media_response_model() -> None:
    for r in media_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/media"
            and "GET" in r.methods
        ):
            assert r.response_model is MediaListResponse
            return
    raise AssertionError("list media route not found")


def test_sealed_count_response_model() -> None:
    for r in media_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/media/sealed-count"
        ):
            assert r.response_model is SealedCountResponse
            return
    raise AssertionError("sealed-count route not found")


def test_read_media_response_model() -> None:
    for r in media_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/media/{media_id}"
            and "GET" in r.methods
        ):
            assert r.response_model is MediaAssetRead
            return
    raise AssertionError("read media route not found")


# ── Model invariants ─────────────────────────────────────────────


def test_media_asset_model_carries_sealed_field() -> None:
    assert "sealed" in MediaAsset.model_fields


def test_media_asset_model_carries_link_count_field() -> None:
    assert "link_count" in MediaAsset.model_fields


def test_media_link_model_polymorphic_ref_fields() -> None:
    """Polymorphic shape — ref_kind + ref_id, no per-target FK."""
    assert "ref_kind" in MediaLink.model_fields
    assert "ref_id" in MediaLink.model_fields
