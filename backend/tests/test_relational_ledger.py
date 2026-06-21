"""Phase 05 relational-ledger tests.

Covers contracts / oaths / initiations / servitors / attestations.
Pure-Python class-shape tests. DB integration via the deploy round-trip.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import uuid4

from theourgia.models.attestations import (
    Attestation,
    AttestationKind,
    AttestationSignature,
    AttestationVisibility,
)
from theourgia.models.contracts import (
    BindingKind,
    Contract,
    ContractStatus,
    ObligationStatus,
)
from theourgia.models.entries import EncryptionMode
from theourgia.models.initiations import Initiation, InitiationStatus
from theourgia.models.oaths import Oath, OathKind, OathStatus
from theourgia.models.servitors import (
    Servitor,
    ServitorKind,
    ServitorStatus,
    ServitorTask,
    ServitorTaskStatus,
)


# ───── Contracts ──────────────────────────────────────────────────────


def test_contract_construct_minimal() -> None:
    c = Contract(
        entity_id=uuid4(),
        title="Pact with Hekate · Beltane 2026",
    )
    assert c.status == ContractStatus.DRAFT
    assert c.binding_kind == BindingKind.VERBAL
    assert c.renewable is False
    assert c.our_obligations == []


def test_contract_structured_obligations() -> None:
    c = Contract(
        entity_id=uuid4(),
        title="x",
        our_obligations=[
            {
                "id": "obl-1",
                "description": "Monthly Deipnon offering.",
                "status": "in-progress",
                "due_at": "2026-07-15T00:00:00Z",
            },
            {
                "id": "obl-2",
                "description": "Memorial offering at Samhain.",
                "status": "pending",
                "due_at": "2026-10-31T00:00:00Z",
            },
        ],
    )
    assert len(c.our_obligations) == 2
    assert c.our_obligations[0]["status"] == "in-progress"


def test_obligation_status_values() -> None:
    assert {s.value for s in ObligationStatus} == {
        "pending", "in-progress", "fulfilled", "overdue", "waived",
    }


def test_binding_kind_values() -> None:
    kinds = {k.value for k in BindingKind}
    assert "verbal" in kinds
    assert "blood" in kinds
    assert "name-bound" in kinds


# ───── Oaths ──────────────────────────────────────────────────────────


def test_oath_defaults_sealed() -> None:
    """Plan invariant: oaths default to sealed encryption."""
    o = Oath(kind=OathKind.SELF, taken_at=datetime(2026, 6, 21, tzinfo=UTC))
    assert o.encryption_mode == EncryptionMode.SEALED


def test_oath_kind_values() -> None:
    assert {k.value for k in OathKind} == {
        "self", "tradition", "order", "deity",
        "partner", "community", "other",
    }


def test_oath_carries_accountability_checkpoints() -> None:
    o = Oath(
        kind=OathKind.SELF,
        taken_at=datetime(2026, 6, 21, tzinfo=UTC),
        accountability_checkpoints=[
            {"due_at": "2026-09-21T00:00:00Z", "completed_at": None},
            {"due_at": "2026-12-21T00:00:00Z", "completed_at": None},
        ],
    )
    assert len(o.accountability_checkpoints) == 2


def test_oath_status_lifecycle() -> None:
    assert {s.value for s in OathStatus} == {
        "active", "fulfilled", "broken", "renounced", "lapsed",
    }


# ───── Initiations ────────────────────────────────────────────────────


def test_initiation_defaults_sealed() -> None:
    """Plan invariant: initiation records MUST default to sealed."""
    i = Initiation(tradition="OTO")
    assert i.encryption_mode == EncryptionMode.SEALED
    assert i.status == InitiationStatus.ACTIVE


def test_initiation_tradition_is_plaintext_user_controlled() -> None:
    """The tradition column is the only plaintext field beyond
    bare-bones — user opts into showing it.
    """
    i = Initiation(tradition="Golden Dawn descendants")
    assert i.tradition == "Golden Dawn descendants"


def test_initiation_publicly_disclosed_at_optional() -> None:
    """Defaults NULL — only set when the user explicitly publishes
    for a counter-signed lineage attestation.
    """
    i = Initiation(tradition="x")
    assert i.publicly_disclosed_at is None


# ───── Servitors ──────────────────────────────────────────────────────


def test_servitor_kind_distinguishes_egregore() -> None:
    """ServitorKind enum captures the egregore-vs-servitor distinction."""
    assert {k.value for k in ServitorKind} == {"servitor", "egregore"}


def test_servitor_default_active_individual() -> None:
    s = Servitor(name="Guardian-A")
    assert s.kind == ServitorKind.SERVITOR
    assert s.status == ServitorStatus.ACTIVE
    assert s.members == []


def test_egregore_carries_members_list() -> None:
    s = Servitor(
        name="Lodge collective",
        kind=ServitorKind.EGREGORE,
        members=[str(uuid4()), str(uuid4()), str(uuid4())],
    )
    assert s.kind == ServitorKind.EGREGORE
    assert len(s.members) == 3


def test_servitor_lifespan_limit_planned_retirement() -> None:
    s = Servitor(
        name="Project Helper",
        lifespan_limit=date(2027, 12, 31),
    )
    assert s.lifespan_limit == date(2027, 12, 31)


def test_servitor_task_status_values() -> None:
    assert {s.value for s in ServitorTaskStatus} == {
        "pending", "in-progress", "completed", "abandoned",
    }


def test_servitor_task_construct() -> None:
    task = ServitorTask(
        servitor_id=uuid4(),
        description="Watch over the threshold during the working.",
        given_at=datetime(2026, 6, 21, tzinfo=UTC),
        status=ServitorTaskStatus.IN_PROGRESS,
    )
    assert task.status == ServitorTaskStatus.IN_PROGRESS


# ───── Attestations ───────────────────────────────────────────────────


def test_attestation_visibility_default_private() -> None:
    """A lineage claim defaults to private — explicit user action to publish."""
    a = Attestation(
        kind=AttestationKind.INITIATION,
        description="Minerval of OTO since 2020-03-20.",
        signed_statement=b'{"kind":"initiation","tradition":"OTO","grade":"Minerval"}',
    )
    assert a.visibility == AttestationVisibility.PRIVATE


def test_attestation_kind_values() -> None:
    kinds = {k.value for k in AttestationKind}
    assert "initiation" in kinds
    assert "grade-granted" in kinds
    assert "teacher-student" in kinds


def test_attestation_signature_roles() -> None:
    """role distinguishes self / counter-sign / revocation."""
    sig = AttestationSignature(
        attestation_id=uuid4(),
        signer_label="L. Vespera (lodge master)",
        signer_public_key=b"\x00" * 32,
        signature=b"\x00" * 64,
        role="counter-sign",
        signed_at=datetime(2026, 6, 21, tzinfo=UTC),
    )
    assert sig.role == "counter-sign"
    assert len(sig.signer_public_key) == 32
    assert len(sig.signature) == 64


def test_attestation_revocation_pattern() -> None:
    """Revocation is a separate signed row with role = 'revocation'.

    The model supports the pattern; the verification logic lands in
    the API layer in a follow-up batch.
    """
    sig = AttestationSignature(
        attestation_id=uuid4(),
        signer_label="L. Vespera (lodge master)",
        signer_public_key=b"\x00" * 32,
        signature=b"\x00" * 64,
        role="revocation",
        signed_at=datetime(2027, 1, 1, tzinfo=UTC),
    )
    assert sig.role == "revocation"


# ───── Cross-cutting: every Phase 05 ledger has an owner_id ──────────


def test_every_ledger_has_owner_id() -> None:
    """RLS depends on owner_id existing on every row that can be
    scoped to a user. Check the substrate carries it consistently.
    """
    classes_with_owner = [Contract, Oath, Initiation, Servitor]
    for cls in classes_with_owner:
        assert hasattr(cls, "owner_id"), f"{cls.__name__} missing owner_id"
