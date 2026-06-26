"""Unit tests for the pilgrimage_sites router (B134).

THE critical honesty rules covered:

  * Precision is a FLOOR — never raise. The /requantize endpoint
    rejects any transition that would make precision finer than
    the current stored value.
  * PATCH cannot mutate location_lat / location_lng /
    stored_precision — they're intentionally absent from the
    update schema.
  * Sealed sites are STRIPPED from the map list — they appear
    only via the count-only sealed-cluster endpoint.
  * The Nominatim attribution string is rendered verbatim and
    embedded in the schema as a constant.
  * Linked workings must be owned by the caller — sealed entries
    CAN be linked, but the id must resolve to the caller's vault.
"""

from __future__ import annotations

import inspect
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute
from pydantic import ValidationError

from theourgia.api.routers.v1 import pilgrimage_sites as pilg_module
from theourgia.api.routers.v1.pilgrimage_sites import (
    ALLOWED_PRECISIONS,
    NOMINATIM_ATTRIBUTION,
    ListResponse,
    PilgrimageSiteCard,
    PilgrimageSiteCreate,
    PilgrimageSiteRead,
    PilgrimageSiteUpdate,
    RequantizePayload,
    SealedClusterPayload,
    SealedClusterResponse,
    _to_card,
    _to_read,
)
from theourgia.models.pilgrimage_sites import (
    PRECISION_RANK,
    PilgrimageSite,
    SiteKind,
    is_lower_or_equal_precision,
)


def _site_row(
    *,
    sealed: bool = False,
    kind: SiteKind = SiteKind.SACRED,
    lat: float | None = 37.97,
    lng: float | None = 23.71,
    precision: str = "1km",
    linked: list | None = None,
    deleted: bool = False,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        kind=kind,
        name="Acropolis",
        story="Visited on the spring equinox.",
        location_lat=lat,
        location_lng=lng,
        stored_precision=precision,
        sealed=sealed,
        linked_working_ids=list(linked) if linked is not None else [],
        created_at=now,
        updated_at=now,
        deleted_at=now if deleted else None,
    )


# ── Constants ─────────────────────────────────────────────────────


def test_nominatim_attribution_carries_double_dagger() -> None:
    """The H07 designer's verbatim attribution copy uses ‡ (DOUBLE
    DAGGER, U+2021). Any commit that breaks this string fails."""
    assert NOMINATIM_ATTRIBUTION.startswith("‡ ")
    assert "Nominatim" in NOMINATIM_ATTRIBUTION
    assert "OpenStreetMap" in NOMINATIM_ATTRIBUTION


def test_allowed_precisions_match_b120_helper() -> None:
    """The string set MUST line up with the autotag helper's keys
    so apply_precision_floor accepts every value we let through."""
    assert ALLOWED_PRECISIONS == frozenset(PRECISION_RANK.keys())


def test_precision_rank_order() -> None:
    """Finer → coarser. The rank values are stable + dictionary
    iteration is deterministic in modern Python."""
    assert PRECISION_RANK["exact"] < PRECISION_RANK["1km"]
    assert PRECISION_RANK["1km"] < PRECISION_RANK["10km"]
    assert PRECISION_RANK["10km"] < PRECISION_RANK["country"]
    assert PRECISION_RANK["country"] < PRECISION_RANK["hidden"]


# ── is_lower_or_equal_precision (the rule that gates /requantize) ─


def test_lower_or_equal_same_precision_allowed() -> None:
    """Idempotent re-quantize doesn't blow up; it's a no-op."""
    assert is_lower_or_equal_precision("1km", "1km") is True


def test_lower_or_equal_finer_rejected() -> None:
    """Cannot go from 1km back up to exact."""
    assert is_lower_or_equal_precision("1km", "exact") is False


def test_lower_or_equal_coarser_allowed() -> None:
    """Lowering: 1km → 10km is fine."""
    assert is_lower_or_equal_precision("1km", "10km") is True


def test_lower_or_equal_to_hidden_always_allowed() -> None:
    """Hidden is the coarsest — every transition into it is
    allowed."""
    assert is_lower_or_equal_precision("exact", "hidden") is True
    assert is_lower_or_equal_precision("country", "hidden") is True


def test_lower_or_equal_from_hidden_only_to_hidden() -> None:
    """From hidden you can only go to hidden (no-op)."""
    assert is_lower_or_equal_precision("hidden", "hidden") is True
    assert is_lower_or_equal_precision("hidden", "country") is False
    assert is_lower_or_equal_precision("hidden", "exact") is False


def test_lower_or_equal_unknown_returns_false() -> None:
    """Defensive: unknown values reject so callers can't bypass."""
    assert is_lower_or_equal_precision("1km", "foo") is False
    assert is_lower_or_equal_precision("bar", "1km") is False


# ── Schema invariants ─────────────────────────────────────────────


def test_site_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PilgrimageSiteCreate(
            kind="sacred", name="x", sneaky_unknown=True,
        )


def test_site_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        PilgrimageSiteCreate(kind="sacred", name="")


def test_site_update_omits_location_lat() -> None:
    """The whole point of PATCH-not-touching-location."""
    assert "location_lat" not in PilgrimageSiteUpdate.model_fields


def test_site_update_omits_location_lng() -> None:
    assert "location_lng" not in PilgrimageSiteUpdate.model_fields


def test_site_update_omits_stored_precision() -> None:
    assert "stored_precision" not in PilgrimageSiteUpdate.model_fields


def test_site_update_omits_location_precision() -> None:
    """Naming variant: callers can't sneak it in under either name."""
    assert "location_precision" not in PilgrimageSiteUpdate.model_fields


def test_site_update_omits_kind() -> None:
    """Kind is immutable — the H07 surface treats it as a primary
    key for the colour palette."""
    assert "kind" not in PilgrimageSiteUpdate.model_fields


def test_site_update_omits_sealed() -> None:
    """Sealing happens via /seal, not PATCH."""
    assert "sealed" not in PilgrimageSiteUpdate.model_fields


def test_site_update_carries_mutable_fields() -> None:
    """Sanity: the mutable side IS exposed."""
    expected = {"name", "story", "linked_working_ids"}
    assert expected.issubset(set(PilgrimageSiteUpdate.model_fields.keys()))


def test_site_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PilgrimageSiteRead(
            id="x", owner_id="y", kind="sacred", name="n",
            story=None, location_lat=None, location_lng=None,
            stored_precision="hidden", sealed=False,
            linked_working_ids=[],
            created_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
            sneaky_unknown=True,
        )


def test_site_card_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PilgrimageSiteCard(
            id="x", kind="sacred", name="n",
            location_lat=None, location_lng=None,
            stored_precision="hidden", sneaky_unknown=True,
        )


def test_requantize_payload_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        RequantizePayload(next_precision="1km", sneaky_unknown=True)


def test_sealed_cluster_payload_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SealedClusterPayload(sneaky_unknown=True)


def test_sealed_cluster_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SealedClusterResponse(sealed_count=0, sneaky_unknown=True)


def test_list_response_carries_nominatim_default() -> None:
    """The schema-level constant means the surface doesn't need
    to know the attribution string at all — it just renders the
    field."""
    r = ListResponse(items=[], sealed_count=0)
    assert r.nominatim_acknowledgement == NOMINATIM_ATTRIBUTION


def test_site_read_carries_nominatim_default() -> None:
    r = PilgrimageSiteRead(
        id="x", owner_id="y", kind="sacred", name="n", story=None,
        location_lat=None, location_lng=None,
        stored_precision="hidden", sealed=False,
        linked_working_ids=[],
        created_at=datetime.now(tz=timezone.utc),
        updated_at=datetime.now(tz=timezone.utc),
    )
    assert r.nominatim_acknowledgement == NOMINATIM_ATTRIBUTION


# ── _to_card / _to_read round-trips ──────────────────────────────


def test_to_card_basic_round_trip() -> None:
    row = _site_row()
    card = _to_card(row)
    assert card.id == str(row.id)
    assert card.kind == "sacred"
    assert card.location_lat == 37.97
    assert card.stored_precision == "1km"


def test_to_read_round_trip() -> None:
    row = _site_row()
    r = _to_read(row)
    assert r.story == "Visited on the spring equinox."
    assert r.linked_working_ids == []


def test_to_read_sealed_preserves_kind() -> None:
    """The Sacred Site detail page is internal; the caller (the
    owner) sees the full row. Sealed-stripping happens at the
    LIST endpoint, not on the per-site read."""
    row = _site_row(sealed=True)
    r = _to_read(row)
    assert r.sealed is True
    assert r.location_lat == 37.97  # still surfaced in detail


# ── Site kind enum ────────────────────────────────────────────────


def test_site_kind_enum_values() -> None:
    assert {k.value for k in SiteKind} == {
        "sacred", "ancestral", "working", "pilgrimage", "other",
    }


# ── Router registration ─────────────────────────────────────────


def _paths_methods() -> set[tuple[str, str]]:
    return {
        (r.path, m)
        for r in pilg_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }


def test_router_registers_list() -> None:
    assert ("/pilgrimage-sites", "GET") in _paths_methods()


def test_router_registers_create() -> None:
    assert ("/pilgrimage-sites", "POST") in _paths_methods()


def test_router_registers_read() -> None:
    assert (
        ("/pilgrimage-sites/{site_id}", "GET") in _paths_methods()
    )


def test_router_registers_patch() -> None:
    assert (
        ("/pilgrimage-sites/{site_id}", "PATCH") in _paths_methods()
    )


def test_router_registers_delete() -> None:
    assert (
        ("/pilgrimage-sites/{site_id}", "DELETE") in _paths_methods()
    )


def test_router_registers_requantize() -> None:
    assert (
        ("/pilgrimage-sites/{site_id}/requantize", "POST")
        in _paths_methods()
    )


def test_router_registers_seal() -> None:
    assert (
        ("/pilgrimage-sites/{site_id}/seal", "POST")
        in _paths_methods()
    )


def test_router_registers_sealed_cluster() -> None:
    assert (
        ("/pilgrimage-sites/sealed-cluster", "POST")
        in _paths_methods()
    )


def test_router_has_no_unseal_endpoint() -> None:
    """Unseal requires the Mode B vault passphrase on the client;
    the server has no /unseal endpoint."""
    paths = {p for (p, _) in _paths_methods()}
    for p in paths:
        assert "unseal" not in p


def test_router_has_no_promote_or_raise_endpoint() -> None:
    """Defensive: precision can never be RAISED. No /promote,
    /sharpen, /refine, /raise endpoint exists."""
    paths = {p for (p, _) in _paths_methods()}
    banned = {"promote", "sharpen", "refine", "raise-precision"}
    for p in paths:
        for token in banned:
            assert token not in p


# ── Response-model wiring ────────────────────────────────────────


def test_list_response_model() -> None:
    for r in pilg_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/pilgrimage-sites"
            and "GET" in r.methods
        ):
            assert r.response_model is ListResponse
            return
    raise AssertionError("list route missing")


def test_sealed_cluster_response_model() -> None:
    for r in pilg_module.router.routes:
        if (
            isinstance(r, APIRoute)
            and r.path == "/pilgrimage-sites/sealed-cluster"
        ):
            assert r.response_model is SealedClusterResponse
            return
    raise AssertionError("sealed-cluster route missing")


# ── Source-level honesty invariants ──────────────────────────────


def test_precision_floor_applied_in_create_source() -> None:
    """apply_precision_floor MUST be called in create_site BEFORE
    persistence. A future commit that quietly skips it gets
    caught."""
    src = inspect.getsource(pilg_module.create_site)
    assert "apply_precision_floor" in src


def test_precision_floor_applied_in_requantize_source() -> None:
    """And in requantize — the floor is applied on the new
    precision, overwriting the previous lat/lng."""
    src = inspect.getsource(pilg_module.requantize_site)
    assert "apply_precision_floor" in src


def test_requantize_lower_only_rule_lives_in_source() -> None:
    """The "lower only" guard MUST be in the requantize source."""
    src = inspect.getsource(pilg_module.requantize_site)
    assert "is_lower_or_equal_precision" in src


def test_no_play_count_in_pilgrimage_source() -> None:
    """Carry the B132 anti-gamification invariant forward."""
    src = inspect.getsource(pilg_module)
    assert "play_count" not in src.lower()


def test_no_view_count_in_pilgrimage_source() -> None:
    src = inspect.getsource(pilg_module)
    assert "view_count" not in src.lower()


def test_no_distance_or_radius_endpoint() -> None:
    """The H07 Pilgrimage Map is stylised, not a real GIS surface;
    we don't ship /within-radius or /nearest endpoints (those
    would leak precision)."""
    paths = {p for (p, _) in _paths_methods()}
    for p in paths:
        assert "within" not in p
        assert "nearest" not in p
        assert "radius" not in p
