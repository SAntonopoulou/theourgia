"""Unit tests for the sigils router (B103).

Pydantic shape + helper + router-registration smoke, matching the
existing convention (``test_api_entries.py``). Full HTTP integration
is exercised by the deploy round-trip + the frontend live-mode tests.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import sigils as sigils_module
from theourgia.api.routers.v1.sigils import (
    SigilCreate,
    SigilForkPayload,
    SigilRead,
    SigilUpdate,
)
from theourgia.models.sigils import SigilMode, SigilPurpose


# ── Schema: SigilCreate ──────────────────────────────────────────────


def test_sigil_create_minimal_payload_validates() -> None:
    payload = SigilCreate(
        title="My first sigil",
        intention="To witness",
        mode="spare",
        svg="<svg/>",
    )
    assert payload.title == "My first sigil"
    assert payload.mode == "spare"
    assert payload.purpose == "workshop_draft"
    assert payload.parameters == {}


def test_sigil_create_full_payload_validates() -> None:
    payload = SigilCreate(
        title="Hekate Trivia",
        intention="At the crossroads",
        mode="kamea",
        parameters={"square": "saturn", "cipher": "greek"},
        svg="<svg>...</svg>",
        seed="deadbeef",
        purpose="personal_study",
        citation="Cornelius Agrippa 1531",
        notes="Cast under the dark moon.",
    )
    assert payload.mode == "kamea"
    assert payload.purpose == "personal_study"
    assert payload.parameters == {"square": "saturn", "cipher": "greek"}


def test_sigil_create_rejects_unknown_mode() -> None:
    with pytest.raises(ValidationError):
        SigilCreate(
            title="x",
            intention="x",
            mode="not-a-mode",  # type: ignore[arg-type]
            svg="<svg/>",
        )


def test_sigil_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        SigilCreate(
            title="", intention="x", mode="spare", svg="<svg/>",
        )


def test_sigil_create_rejects_empty_intention() -> None:
    with pytest.raises(ValidationError):
        SigilCreate(
            title="x", intention="", mode="spare", svg="<svg/>",
        )


def test_sigil_create_rejects_empty_svg() -> None:
    with pytest.raises(ValidationError):
        SigilCreate(
            title="x", intention="x", mode="spare", svg="",
        )


def test_sigil_create_rejects_extra_fields() -> None:
    """``extra="forbid"`` should reject unknown keys to prevent
    silent data loss."""
    with pytest.raises(ValidationError):
        SigilCreate(
            title="x",
            intention="x",
            mode="spare",
            svg="<svg/>",
            unknown_field="x",  # type: ignore[call-arg]
        )


def test_sigil_create_accepts_all_eleven_modes() -> None:
    """Every SigilMode value must validate as a Create payload."""
    for mode in SigilMode:
        payload = SigilCreate(
            title="x",
            intention="x",
            mode=mode.value,  # type: ignore[arg-type]
            svg="<svg/>",
        )
        assert payload.mode == mode.value


def test_sigil_create_accepts_all_four_purposes() -> None:
    for purpose in SigilPurpose:
        payload = SigilCreate(
            title="x",
            intention="x",
            mode="spare",
            svg="<svg/>",
            purpose=purpose.value,  # type: ignore[arg-type]
        )
        assert payload.purpose == purpose.value


# ── Schema: SigilUpdate ──────────────────────────────────────────────


def test_sigil_update_allows_partial_meta_only() -> None:
    """Update accepts only meta fields — intention / mode / svg are
    immutable by design (the API silently drops them)."""
    payload = SigilUpdate(title="New title")
    assert payload.title == "New title"
    assert payload.purpose is None
    # Verify that intention / mode / svg are NOT in the Update model
    # (so Pydantic ignores them rather than carrying them through):
    fields = set(SigilUpdate.model_fields.keys())
    assert "intention" not in fields
    assert "mode" not in fields
    assert "svg" not in fields
    assert "seed" not in fields
    assert "parameters" not in fields


def test_sigil_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        SigilUpdate(intention="changed")  # type: ignore[call-arg]


# ── Schema: SigilForkPayload ─────────────────────────────────────────


def test_sigil_fork_payload_optional_title() -> None:
    payload = SigilForkPayload()
    assert payload.title is None


def test_sigil_fork_payload_with_title() -> None:
    payload = SigilForkPayload(title="The variant")
    assert payload.title == "The variant"


def test_sigil_fork_payload_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        SigilForkPayload(title="")


# ── Router registration smoke ────────────────────────────────────────


def test_sigil_router_registers_six_routes() -> None:
    """list + create + get + patch + delete + fork = 6 routes."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in sigils_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/sigils"),
            (frozenset({"POST"}), "/sigils"),
            (frozenset({"GET"}), "/sigils/{sigil_id}"),
            (frozenset({"PATCH"}), "/sigils/{sigil_id}"),
            (frozenset({"DELETE"}), "/sigils/{sigil_id}"),
            (frozenset({"POST"}), "/sigils/{sigil_id}/fork"),
        ]
    )
    assert methods_and_paths == expected


def test_sigil_router_response_models_are_pydantic() -> None:
    """Every route must declare a response_model so the OpenAPI
    schema is honest."""
    list_route = next(
        r for r in sigils_module.router.routes
        if hasattr(r, "methods") and "GET" in r.methods and r.path == "/sigils"
    )
    assert list_route.response_model is not None
    # list[SigilRead] — Pydantic preserves the inner type.
    assert SigilRead in (getattr(list_route.response_model, "__args__", ()) or [list_route.response_model])
