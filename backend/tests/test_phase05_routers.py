"""Phase 05 router shape tests (Batch 43).

Pure-Python tests of the Pydantic schemas + helper functions used by
the new Phase 05 routers. The DB-integration round-trip is covered by
the deploy test path (which can use a real Postgres) — these tests
lock the typed contract so a schema drift fails fast.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest


# ───── offerings.py ───────────────────────────────────────────────────


def test_offering_create_payload_minimal() -> None:
    from theourgia.api.routers.v1.offerings import OfferingCreate

    payload = OfferingCreate(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
    )
    assert payload.items == []
    assert payload.reception_perceived is None


def test_offering_create_accepts_full_payload() -> None:
    from theourgia.api.routers.v1.offerings import OfferingCreate

    payload = OfferingCreate(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
        items=[{"kind": "wine", "quantity": 1, "unit": "cup"}],
        intention="At the dark of the moon.",
        reception_perceived="clear",
        location="Crossroads",
        location_lat=37.97,
        location_lon=23.72,
    )
    assert payload.reception_perceived == "clear"
    assert payload.items[0]["kind"] == "wine"


def test_recurring_offering_create_locks_cadence_string() -> None:
    from theourgia.api.routers.v1.offerings import RecurringOfferingCreate

    payload = RecurringOfferingCreate(
        entity_id=uuid4(),
        label="Hekate Deipnon",
        cadence="lunar:deipnon",
        items_template=[{"kind": "wine"}, {"kind": "honey"}],
    )
    assert payload.cadence == "lunar:deipnon"
    assert payload.is_active is True


# ───── contracts.py ───────────────────────────────────────────────────


def test_contract_create_default_status_is_draft() -> None:
    from theourgia.api.routers.v1.contracts import ContractCreate

    payload = ContractCreate(
        entity_id=uuid4(),
        title="Beltane pact",
    )
    assert payload.status == "draft"
    assert payload.binding_kind == "verbal"
    assert payload.renewable is False


def test_fulfill_obligation_payload_defaults_to_fulfilled() -> None:
    from theourgia.api.routers.v1.contracts import FulfillObligationRequest

    payload = FulfillObligationRequest(
        side="ours",
        obligation_id="ob-001",
    )
    assert payload.new_status == "fulfilled"
    assert payload.side == "ours"


def test_fulfill_obligation_helper_flips_status_in_place() -> None:
    """The helper mutates the obligations list and returns True only
    when it found the obligation."""
    from theourgia.api.routers.v1.contracts import _apply_obligation_update
    from theourgia.models.contracts import ObligationStatus

    obligations: list[dict[str, object]] = [
        {"id": "a", "description": "A", "status": "pending"},
        {"id": "b", "description": "B", "status": "in-progress"},
    ]
    found = _apply_obligation_update(
        obligations, "b",
        ObligationStatus.FULFILLED,
        datetime(2026, 6, 21, 12, tzinfo=UTC),
        "Done at noon.",
    )
    assert found is True
    assert obligations[1]["status"] == "fulfilled"
    assert obligations[1]["notes"] == "Done at noon."
    assert "fulfilled_at" in obligations[1]


def test_fulfill_obligation_helper_returns_false_when_id_missing() -> None:
    from theourgia.api.routers.v1.contracts import _apply_obligation_update
    from theourgia.models.contracts import ObligationStatus

    obligations: list[dict[str, object]] = [
        {"id": "a", "description": "A", "status": "pending"},
    ]
    found = _apply_obligation_update(
        obligations, "not-there", ObligationStatus.FULFILLED, None, None,
    )
    assert found is False


# ───── oaths.py ───────────────────────────────────────────────────────


def test_oath_create_default_encryption_is_sealed() -> None:
    from theourgia.api.routers.v1.oaths import OathCreate

    payload = OathCreate(
        kind="self",
        taken_at=datetime(2026, 6, 21, 12, tzinfo=UTC),
        encrypted_payload=b"ciphertext",
    )
    assert payload.encryption_mode == "sealed"


def test_oath_create_rejects_invalid_kind() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.oaths import OathCreate

    with pytest.raises(ValidationError):
        OathCreate(
            kind="not-a-kind",  # type: ignore[arg-type]
            taken_at=datetime(2026, 6, 21, 12, tzinfo=UTC),
            encrypted_payload=b"x",
        )


# ───── initiations.py — sealed-only writer ────────────────────────────


def test_initiation_create_only_accepts_sealed() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.initiations import InitiationCreate

    # The Pydantic `Literal["sealed"]` rejects anything else at parse time.
    with pytest.raises(ValidationError):
        InitiationCreate(
            tradition="OTO",
            encryption_mode="none",  # type: ignore[arg-type]
            encrypted_payload=b"x",
        )


def test_initiation_create_accepts_sealed_payload() -> None:
    from theourgia.api.routers.v1.initiations import InitiationCreate

    payload = InitiationCreate(
        tradition="Hellenic mystery",
        encryption_mode="sealed",
        encrypted_payload=b"ciphertext",
    )
    assert payload.encryption_mode == "sealed"
    assert payload.status == "active"


# ───── servitors.py ───────────────────────────────────────────────────


def test_servitor_create_defaults_to_servitor_kind_active() -> None:
    from theourgia.api.routers.v1.servitors import ServitorCreate

    payload = ServitorCreate(name="Guardian")
    assert payload.kind == "servitor"
    assert payload.status == "active"
    assert payload.members == []


def test_feed_request_accepts_optional_timestamp() -> None:
    from theourgia.api.routers.v1.servitors import FeedRequest

    empty = FeedRequest()
    assert empty.fed_at is None
    assert empty.notes is None

    with_ts = FeedRequest(fed_at=datetime(2026, 6, 21, 12, tzinfo=UTC))
    assert with_ts.fed_at is not None


def test_servitor_task_create_payload() -> None:
    from theourgia.api.routers.v1.servitors import ServitorTaskCreate

    payload = ServitorTaskCreate(
        description="Protect the threshold.",
        given_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
    )
    assert payload.status == "pending"
    assert payload.description == "Protect the threshold."


# ───── entity_aliases.py + entity_views.py ───────────────────────────


def test_entity_alias_kind_literal_matches_enum() -> None:
    from theourgia.api.routers.v1.entity_aliases import EntityAliasCreate

    for kind in ("same-as", "aspect-of", "aspect-includes", "syncretic-with", "epithet-of"):
        payload = EntityAliasCreate(
            source_entity_id=uuid4(),
            target_entity_id=uuid4(),
            kind=kind,  # type: ignore[arg-type]
        )
        assert payload.kind == kind


def test_entity_view_create_payload() -> None:
    from theourgia.api.routers.v1.entity_aliases import EntityViewCreate

    payload = EntityViewCreate(
        name="Hekate-all",
        member_entity_ids=[str(uuid4()), str(uuid4())],
        description="All aspects of Hekate I work with.",
    )
    assert payload.name == "Hekate-all"
    assert len(payload.member_entity_ids) == 2


# ───── entities.py — aggregate response shape ─────────────────────────


def test_entity_aggregate_response_carries_focus_and_members() -> None:
    from theourgia.api.routers.v1.entities import (
        AliasNeighbour,
        EntityAggregate,
        EntityRead,
    )

    focus_id = str(uuid4())
    other_id = str(uuid4())
    focus = EntityRead(
        id=focus_id,
        name="Hekate",
        kind="goddess",
        aliases=[],
        epithets=["Soteira"],
        glyph="entity",
        pronouns="she/her",
        gender=None,
        summary=None,
        description=None,
        tradition="Hellenic",
        tradition_tags=["Hellenic"],
        attributions={},
        seal_upload_id=None,
        portrait_upload_id=None,
        relationship_status="active",
        first_contact_at=None,
        last_contact_at=None,
        notes_private=None,
        notes_shareable=None,
        visibility="personal",
        origin="personal",
        owner_id=None,
        created_at=datetime(2026, 6, 21, tzinfo=UTC),
        updated_at=datetime(2026, 6, 21, tzinfo=UTC),
    )
    aggregate = EntityAggregate(
        focus=focus,
        neighbours=[
            AliasNeighbour(
                entity_id=other_id,
                kind="same-as",
                direction="outgoing",
                notes=None,
            ),
        ],
        member_entity_ids=[focus_id, other_id],
        views=[],
    )
    assert aggregate.focus.name == "Hekate"
    assert aggregate.member_entity_ids == [focus_id, other_id]
    assert aggregate.neighbours[0].kind == "same-as"


# ───── attestations.py — signing primitives + claim canonicalisation ─


def test_canonical_attestation_bytes_is_sorted_compact_json() -> None:
    from theourgia.core.federation.signing import canonical_attestation_bytes

    claim = {"b": 2, "a": 1, "c": None}
    out = canonical_attestation_bytes(claim)
    assert out == b'{"a":1,"b":2,"c":null}'


def test_canonical_attestation_bytes_handles_unicode() -> None:
    from theourgia.core.federation.signing import canonical_attestation_bytes

    claim = {"signer": "Soror Ευ. Α."}
    out = canonical_attestation_bytes(claim)
    assert "Ευ. Α." in out.decode("utf-8")


def test_sign_then_verify_round_trip() -> None:
    """Ed25519 round-trip: signature verifies, tampered bytes don't."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    from theourgia.core.federation.signing import sign_bytes, verify_signature

    priv = Ed25519PrivateKey.generate()
    pub = priv.public_key()
    msg = b"lineage attestation: I am a Minerval of OTO since 2020-03-20"
    sig = sign_bytes(priv, msg)
    assert verify_signature(pub, msg, sig) is True
    assert verify_signature(pub, msg + b"x", sig) is False


def test_verify_signature_never_raises_on_garbage() -> None:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    from theourgia.core.federation.signing import verify_signature

    pub = Ed25519PrivateKey.generate().public_key()
    # 64-byte all-zero signature is malformed (zero point); verifier
    # must return False, not raise.
    assert verify_signature(pub, b"anything", b"\x00" * 64) is False


def test_attestation_create_payload_requires_one_signing_path() -> None:
    """The two-paths-XOR rule lives in the endpoint, not Pydantic; the
    schema accepts both fields present and the handler rejects."""
    from theourgia.api.routers.v1.attestations import AttestationCreate

    payload = AttestationCreate(
        kind="initiation",
        description="x",
        signer_label="self",
        signer_public_key=b"\x00" * 32,
        self_signature=b"\x00" * 64,
    )
    assert payload.self_signature is not None
    assert payload.private_key is None


# ───── phase05.py reminder helpers ────────────────────────────────────


def test_feeding_overdue_after_cadence_passed() -> None:
    from theourgia.core.tasks.phase05 import _feeding_overdue

    now = datetime(2026, 6, 21, 12, tzinfo=UTC)
    yesterday = now - timedelta(days=1, hours=1)

    assert _feeding_overdue(yesterday, "daily", now) is True
    assert _feeding_overdue(now - timedelta(hours=1), "daily", now) is False
    assert _feeding_overdue(None, "weekly", now) is True
    assert _feeding_overdue(yesterday, "monthly", now) is False
    # Unknown cadence vocabulary returns False (handled in a follow-up).
    assert _feeding_overdue(yesterday, "cron:0 0 * * *", now) is False
    assert _feeding_overdue(yesterday, "lunar:deipnon", now) is False
    assert _feeding_overdue(yesterday, None, now) is False


def test_advance_next_due_for_named_cadences() -> None:
    from theourgia.core.tasks.phase05 import _advance_next_due

    base = datetime(2026, 6, 21, 12, tzinfo=UTC)
    assert _advance_next_due("daily", base) == base + timedelta(days=1)
    assert _advance_next_due("weekly", base) == base + timedelta(days=7)
    assert _advance_next_due("monthly", base) == base + timedelta(days=30)
    assert _advance_next_due("cron:0 0 * * *", base) is None
    assert _advance_next_due(None, base) is None


def test_advance_next_due_is_case_insensitive_and_strips() -> None:
    from theourgia.core.tasks.phase05 import _advance_next_due

    base = datetime(2026, 6, 21, 12, tzinfo=UTC)
    assert _advance_next_due("  Daily  ", base) == base + timedelta(days=1)
