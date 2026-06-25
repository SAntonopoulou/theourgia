"""Unit tests for the talismans router (B104).

Pydantic shape + helper + router-registration smoke. Covers the H05
worked-example honesty rules:

  · A consecrated talisman cannot be patched (409, edits require fork).
  · ``front_svg`` / ``back_svg`` / ``components`` are not in
    :class:`TalismanUpdate` — composition edits require fork.
  · Sealing nulls the plaintext columns and switches
    ``encryption_mode`` to SEALED.
  · ``_to_read`` omits plaintext when sealed even if columns are
    still populated (defence in depth).
  · Forking a sealed talisman initialises the child sealed with the
    same ciphertext + IV but does not inherit the consecration link.
"""

from __future__ import annotations

from base64 import b64encode
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1 import talismans as talismans_module
from theourgia.api.routers.v1.talismans import (
    TalismanCreate,
    TalismanForkPayload,
    TalismanRead,
    TalismanSealPayload,
    TalismanUnsealResponse,
    TalismanUpdate,
    _ensure_not_consecrated_locked,
    _to_read,
)
from theourgia.models.entries import EncryptionMode


def _row(
    *,
    encryption_mode: EncryptionMode = EncryptionMode.NONE,
    front_svg: str | None = "<svg>front</svg>",
    back_svg: str | None = "<svg>back</svg>",
    components: dict | None = None,
    encrypted_payload: bytes | None = None,
    encryption_iv: bytes | None = None,
    linked_consecration_working_id=None,
    parent_talisman_id=None,
) -> SimpleNamespace:
    """Build a SimpleNamespace shaped like a Talisman row."""
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Test Talisman",
        purpose="To protect.",
        front_svg=front_svg,
        back_svg=back_svg,
        components=components or {"sigil_ids": [], "square_ids": []},
        materials_notes=None,
        linked_election=None,
        linked_consecration_working_id=linked_consecration_working_id,
        encryption_mode=encryption_mode,
        encrypted_payload=encrypted_payload,
        encryption_iv=encryption_iv,
        parent_talisman_id=parent_talisman_id,
        created_at=now,
        updated_at=now,
    )


# ── Schema: TalismanCreate ───────────────────────────────────────────


def test_talisman_create_minimal_payload_validates() -> None:
    payload = TalismanCreate(
        name="Saturn protection",
        purpose="To shield against intrusion.",
        front_svg="<svg>front</svg>",
        back_svg="<svg>back</svg>",
    )
    assert payload.name == "Saturn protection"
    assert payload.components == {}
    assert payload.materials_notes is None


def test_talisman_create_full_payload_validates() -> None:
    payload = TalismanCreate(
        name="Mercurial gain",
        purpose="To prosper communication.",
        front_svg="<svg>F</svg>",
        back_svg="<svg>B</svg>",
        components={
            "sigil_ids": [str(uuid4())],
            "square_ids": [str(uuid4())],
            "inscriptions": ["WORD"],
        },
        materials_notes="Engrave on tin.",
        linked_election={
            "datetime": "2026-07-04T15:00:00Z",
            "lat": 51.5,
            "lon": -0.1,
        },
    )
    assert "inscriptions" in payload.components
    assert payload.linked_election["lat"] == 51.5


def test_talisman_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        TalismanCreate(
            name="",
            purpose="x",
            front_svg="<svg/>",
            back_svg="<svg/>",
        )


def test_talisman_create_rejects_empty_purpose() -> None:
    with pytest.raises(ValidationError):
        TalismanCreate(
            name="x",
            purpose="",
            front_svg="<svg/>",
            back_svg="<svg/>",
        )


def test_talisman_create_rejects_empty_front_svg() -> None:
    with pytest.raises(ValidationError):
        TalismanCreate(
            name="x", purpose="x", front_svg="", back_svg="<svg/>",
        )


def test_talisman_create_rejects_empty_back_svg() -> None:
    with pytest.raises(ValidationError):
        TalismanCreate(
            name="x", purpose="x", front_svg="<svg/>", back_svg="",
        )


def test_talisman_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TalismanCreate(
            name="x",
            purpose="x",
            front_svg="<svg/>",
            back_svg="<svg/>",
            unknown_field=1,  # type: ignore[call-arg]
        )


# ── Schema: TalismanUpdate ───────────────────────────────────────────


def test_talisman_update_omits_composition_fields() -> None:
    """The H05 honesty rule: composition edits require fork."""
    fields = set(TalismanUpdate.model_fields.keys())
    assert "front_svg" not in fields
    assert "back_svg" not in fields
    assert "components" not in fields
    assert "encryption_mode" not in fields
    assert "encrypted_payload_b64" not in fields
    # Meta fields ARE allowed:
    assert "name" in fields
    assert "purpose" in fields
    assert "materials_notes" in fields
    assert "linked_election" in fields
    assert "linked_consecration_working_id" in fields


def test_talisman_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TalismanUpdate(front_svg="<svg/>")  # type: ignore[call-arg]


def test_talisman_update_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        TalismanUpdate(name="")


# ── Schema: TalismanSealPayload ──────────────────────────────────────


def test_talisman_seal_payload_validates() -> None:
    payload = TalismanSealPayload(
        encrypted_payload_b64=b64encode(b"ciphertext").decode("ascii"),
        encryption_iv_b64=b64encode(b"012345678901").decode("ascii"),
    )
    assert payload.encrypted_payload_b64.startswith("Y2lwa")


def test_talisman_seal_payload_rejects_empty() -> None:
    with pytest.raises(ValidationError):
        TalismanSealPayload(
            encrypted_payload_b64="",
            encryption_iv_b64=b64encode(b"012345678901").decode("ascii"),
        )


def test_talisman_seal_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TalismanSealPayload(
            encrypted_payload_b64=b64encode(b"x").decode("ascii"),
            encryption_iv_b64=b64encode(b"x").decode("ascii"),
            unknown=1,  # type: ignore[call-arg]
        )


# ── Schema: TalismanUnsealResponse ───────────────────────────────────


def test_talisman_unseal_response_round_trips() -> None:
    payload = TalismanUnsealResponse(
        encrypted_payload_b64="QQ==",
        encryption_iv_b64="Qg==",
    )
    assert payload.encrypted_payload_b64 == "QQ=="


# ── Schema: TalismanForkPayload ──────────────────────────────────────


def test_talisman_fork_payload_optional() -> None:
    payload = TalismanForkPayload()
    assert payload.name is None


def test_talisman_fork_payload_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        TalismanForkPayload(name="")


# ── Helper: _to_read defence-in-depth ────────────────────────────────


def test_to_read_omits_plaintext_when_sealed() -> None:
    """Even if the plaintext columns are populated, ``_to_read``
    must not leak them when the row is marked SEALED."""
    row = _row(
        encryption_mode=EncryptionMode.SEALED,
        front_svg="<svg>STILL HERE</svg>",  # should NOT appear in output
        back_svg="<svg>ALSO HERE</svg>",
        components={"sigil_ids": ["leak"]},
        encrypted_payload=b"cipher",
        encryption_iv=b"iv12345678",
    )
    read = _to_read(row)
    assert isinstance(read, TalismanRead)
    assert read.sealed is True
    assert read.front_svg is None
    assert read.back_svg is None
    assert read.components is None
    assert read.encrypted_payload_b64 == b64encode(b"cipher").decode("ascii")
    assert read.encryption_iv_b64 == b64encode(b"iv12345678").decode("ascii")


def test_to_read_returns_plaintext_when_not_sealed() -> None:
    row = _row(encryption_mode=EncryptionMode.NONE)
    read = _to_read(row)
    assert read.sealed is False
    assert read.front_svg == "<svg>front</svg>"
    assert read.back_svg == "<svg>back</svg>"
    assert read.components == {"sigil_ids": [], "square_ids": []}
    assert read.encrypted_payload_b64 is None
    assert read.encryption_iv_b64 is None


def test_to_read_handles_optional_owner_and_parent() -> None:
    row = _row()
    row.owner_id = None
    row.parent_talisman_id = None
    read = _to_read(row)
    assert read.owner_id is None
    assert read.parent_talisman_id is None


# ── Helper: _ensure_not_consecrated_locked ───────────────────────────


def test_ensure_not_consecrated_locked_passes_when_unlinked() -> None:
    row = _row(linked_consecration_working_id=None)
    # Should not raise:
    _ensure_not_consecrated_locked(row)


def test_ensure_not_consecrated_locked_raises_409_when_linked() -> None:
    row = _row(linked_consecration_working_id=uuid4())
    with pytest.raises(HTTPException) as exc:
        _ensure_not_consecrated_locked(row)
    assert exc.value.status_code == 409
    assert "consecrated" in exc.value.detail.lower()


# ── Router registration smoke ────────────────────────────────────────


def test_talisman_router_registers_eight_routes() -> None:
    """list + create + get + patch + delete + seal + unseal + fork."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in talismans_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/talismans"),
            (frozenset({"POST"}), "/talismans"),
            (frozenset({"GET"}), "/talismans/{talisman_id}"),
            (frozenset({"PATCH"}), "/talismans/{talisman_id}"),
            (frozenset({"DELETE"}), "/talismans/{talisman_id}"),
            (frozenset({"POST"}), "/talismans/{talisman_id}/seal"),
            (frozenset({"POST"}), "/talismans/{talisman_id}/unseal"),
            (frozenset({"POST"}), "/talismans/{talisman_id}/fork"),
        ]
    )
    assert methods_and_paths == expected


def test_talisman_router_has_response_models() -> None:
    """OpenAPI honesty — every route declares a response_model
    (except DELETE which returns 204 No Content)."""
    for r in talismans_module.router.routes:
        if not hasattr(r, "methods"):
            continue
        if "DELETE" in r.methods:
            continue
        assert r.response_model is not None, (
            f"{r.path} ({r.methods}) is missing response_model"
        )
