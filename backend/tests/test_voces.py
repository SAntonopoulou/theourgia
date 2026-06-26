"""Unit tests for the voces router + bundled corpus (B107).

Covers:
  · Bundled corpus invariants (≥ 25, unique ids, every entry cites PD).
  · ``source_citation`` honesty rule (required, non-empty).
  · ``fork-bundled`` shape: copies all fields + records bundled id.
  · Pydantic shape (Create / Update / ForkBundled / RecordingCreate).
  · Helper round-trips (_to_voce_read, _to_recording_read).
  · Router-registration smoke.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import voces as voces_module
from theourgia.api.routers.v1.voces import (
    VoceForkBundledPayload,
    VoceMagicaeCreate,
    VoceMagicaeRead,
    VoceMagicaeUpdate,
    VoceRecordingCreate,
    _to_recording_read,
    _to_voce_read,
)
from theourgia.core.workshop.bundled_voces import (
    BUNDLED_VOCES,
    BundledVoce,
    bundled_by_id,
)
from theourgia.models.voces import SourceScript


def _voce_row(
    *,
    source_script: SourceScript = SourceScript.GREEK,
    source_citation: str = "PGM IV.2785 (Preisendanz 1928)",
    forked_from_bundled_id: str | None = None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Test voce",
        source_text="ΕΛΘΕ ΜΟΙ",
        source_script=source_script,
        transliteration="elthe moi",
        ipa="ˈel.tʰe moi̯",
        source_citation=source_citation,
        planetary_associations=["moon"],
        elemental_associations=[],
        linked_entity_ids=[],
        forked_from_bundled_id=forked_from_bundled_id,
        created_at=now,
        updated_at=now,
    )


def _recording_row() -> SimpleNamespace:
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        voce_id=uuid4(),
        audio_attachment_id=uuid4(),
        duration_seconds=42,
        notes=None,
        created_at=now,
        updated_at=now,
    )


# ── Bundled corpus invariants ────────────────────────────────────────


def test_bundled_corpus_has_at_least_twenty_five_entries() -> None:
    assert len(BUNDLED_VOCES) >= 25


def test_bundled_corpus_ids_are_unique() -> None:
    ids = [v.id for v in BUNDLED_VOCES]
    assert len(ids) == len(set(ids))


def test_every_bundled_voce_carries_pd_citation() -> None:
    """The voce honesty rule: no improvisation. Every entry must
    declare a verifiable PD source."""
    for v in BUNDLED_VOCES:
        assert v.source_citation, f"Voce {v.id} is missing a citation."
        assert len(v.source_citation) >= 10, (
            f"Voce {v.id} citation looks too short to be honest "
            f"({v.source_citation!r})."
        )


def test_every_bundled_voce_uses_a_known_script() -> None:
    """Every bundled fixture's source_script must validate against
    the SourceScript enum — fork-bundled relies on this."""
    valid = {s.value for s in SourceScript}
    for v in BUNDLED_VOCES:
        assert v.source_script in valid, (
            f"Voce {v.id} has unknown source_script {v.source_script!r}."
        )


def test_every_bundled_voce_has_nonempty_name_and_text() -> None:
    for v in BUNDLED_VOCES:
        assert v.name and v.source_text


def test_bundled_corpus_includes_each_major_tradition() -> None:
    """The handoff calls for coverage of multiple traditions —
    Greek PGM, Hebrew, Latin, Sanskrit. Verify the corpus reflects
    that breadth."""
    scripts = {v.source_script for v in BUNDLED_VOCES}
    assert "greek" in scripts
    assert "hebrew" in scripts
    assert "latin" in scripts
    assert "sanskrit" in scripts


def test_bundled_by_id_returns_match_or_none() -> None:
    sample = BUNDLED_VOCES[0]
    assert bundled_by_id(sample.id) is sample
    assert bundled_by_id("nonexistent_id") is None


def test_bundled_voce_is_immutable() -> None:
    """``frozen=True`` dataclass — attempting to mutate raises."""
    sample = BUNDLED_VOCES[0]
    with pytest.raises(Exception):
        sample.name = "tampered"  # type: ignore[misc]


# ── Schema: VoceMagicaeCreate ────────────────────────────────────────


def test_voce_create_minimal_payload_validates() -> None:
    payload = VoceMagicaeCreate(
        name="My voce",
        source_text="ΕΛΘΕ",
        source_script="greek",
        source_citation="PGM IV.2785",
    )
    assert payload.source_script == SourceScript.GREEK


def test_voce_create_rejects_empty_citation() -> None:
    """The H05 honesty rule: source_citation must be non-empty."""
    with pytest.raises(ValidationError):
        VoceMagicaeCreate(
            name="x",
            source_text="x",
            source_script="greek",
            source_citation="",
        )


def test_voce_create_rejects_missing_citation() -> None:
    with pytest.raises(ValidationError):
        VoceMagicaeCreate(  # type: ignore[call-arg]
            name="x",
            source_text="x",
            source_script="greek",
        )


def test_voce_create_rejects_invalid_script() -> None:
    with pytest.raises(ValidationError):
        VoceMagicaeCreate(
            name="x",
            source_text="x",
            source_script="klingon",  # type: ignore[arg-type]
            source_citation="x",
        )


def test_voce_create_accepts_all_seven_scripts() -> None:
    for script in SourceScript:
        payload = VoceMagicaeCreate(
            name="x",
            source_text="x",
            source_script=script.value,  # type: ignore[arg-type]
            source_citation="x",
        )
        assert payload.source_script == script


def test_voce_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        VoceMagicaeCreate(
            name="x",
            source_text="x",
            source_script="greek",
            source_citation="x",
            forked_from_bundled_id="leak",  # type: ignore[call-arg]
        )


# ── Schema: VoceMagicaeUpdate ────────────────────────────────────────


def test_voce_update_can_change_citation_but_not_clear_it() -> None:
    """An update with citation="" must be rejected — the honesty
    rule applies to PATCH too."""
    VoceMagicaeUpdate(source_citation="New citation")  # ok
    with pytest.raises(ValidationError):
        VoceMagicaeUpdate(source_citation="")


def test_voce_update_is_fully_optional() -> None:
    payload = VoceMagicaeUpdate()
    assert all(v is None for v in payload.model_dump().values())


def test_voce_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        VoceMagicaeUpdate(forked_from_bundled_id="leak")  # type: ignore[call-arg]


# ── Schema: VoceForkBundledPayload ───────────────────────────────────


def test_fork_bundled_payload_requires_id() -> None:
    with pytest.raises(ValidationError):
        VoceForkBundledPayload(bundled_id="")
    with pytest.raises(ValidationError):
        VoceForkBundledPayload()  # type: ignore[call-arg]


def test_fork_bundled_payload_accepts_valid_id() -> None:
    payload = VoceForkBundledPayload(bundled_id="pgm_iv_2785_hekate_hymn_opening")
    assert payload.bundled_id == "pgm_iv_2785_hekate_hymn_opening"


# ── Schema: VoceRecordingCreate ──────────────────────────────────────


def test_recording_create_validates() -> None:
    payload = VoceRecordingCreate(
        audio_attachment_id=uuid4(),
        duration_seconds=42,
        notes="Cast in candlelight.",
    )
    assert payload.duration_seconds == 42


def test_recording_create_rejects_negative_duration() -> None:
    with pytest.raises(ValidationError):
        VoceRecordingCreate(
            audio_attachment_id=uuid4(),
            duration_seconds=-1,
        )


def test_recording_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        VoceRecordingCreate(
            audio_attachment_id=uuid4(),
            duration_seconds=1,
            voce_id=uuid4(),  # type: ignore[call-arg]
        )


# ── Helpers ──────────────────────────────────────────────────────────


def test_to_voce_read_serialises_enum_and_recordings() -> None:
    row = _voce_row()
    rec = _recording_row()
    read = _to_voce_read(row, [rec])
    assert isinstance(read, VoceMagicaeRead)
    assert read.source_script == "greek"
    assert len(read.recordings) == 1
    assert read.recordings[0].duration_seconds == 42


def test_to_voce_read_with_no_recordings() -> None:
    row = _voce_row()
    read = _to_voce_read(row, [])
    assert read.recordings == []


def test_to_voce_read_includes_forked_from() -> None:
    row = _voce_row(forked_from_bundled_id="pgm_iv_2785_hekate_hymn_opening")
    read = _to_voce_read(row, [])
    assert read.forked_from_bundled_id == "pgm_iv_2785_hekate_hymn_opening"


def test_to_recording_read_round_trips() -> None:
    rec = _recording_row()
    read = _to_recording_read(rec)
    assert str(read.audio_attachment_id) == str(rec.audio_attachment_id)


# ── Router registration smoke ────────────────────────────────────────


def test_voces_router_registers_eleven_routes() -> None:
    """bundled + list + create + get + patch + delete + fork + add-rec
    + del-rec + per-vault-get + per-vault-put = 11 routes.

    Originally 9 (B107); B114 added the 2 per-vault routes.
    """
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in voces_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/voces/bundled"),
            (frozenset({"GET"}), "/voces"),
            (frozenset({"POST"}), "/voces"),
            (frozenset({"GET"}), "/voces/{voce_id}"),
            (frozenset({"PATCH"}), "/voces/{voce_id}"),
            (frozenset({"DELETE"}), "/voces/{voce_id}"),
            (frozenset({"POST"}), "/voces/fork-bundled"),
            (frozenset({"POST"}), "/voces/{voce_id}/recordings"),
            (
                frozenset({"DELETE"}),
                "/voces/{voce_id}/recordings/{recording_id}",
            ),
            (frozenset({"GET"}), "/voces/{voce_id}/per-vault"),
            (frozenset({"PUT"}), "/voces/{voce_id}/per-vault"),
        ]
    )
    assert methods_and_paths == expected


def test_voces_router_response_models() -> None:
    for r in voces_module.router.routes:
        if not hasattr(r, "methods"):
            continue
        if "DELETE" in r.methods:
            continue
        assert r.response_model is not None, (
            f"{r.path} ({r.methods}) is missing response_model"
        )


# ── Sanity: every bundled fixture forks cleanly through the schema ───


def test_every_bundled_voce_forks_through_the_schema() -> None:
    """Sanity guard: each bundled fixture must serialize cleanly via
    BundledVoceRead. Catches any silent drift in the corpus."""
    from theourgia.api.routers.v1.voces import BundledVoceRead

    for v in BUNDLED_VOCES:
        assert isinstance(v, BundledVoce)
        BundledVoceRead(
            id=v.id,
            name=v.name,
            source_text=v.source_text,
            source_script=v.source_script,
            transliteration=v.transliteration,
            ipa=v.ipa,
            source_citation=v.source_citation,
            planetary_associations=list(v.planetary_associations),
            elemental_associations=list(v.elemental_associations),
        )


# ── B114 — Per-vault state ──────────────────────────────────────


def test_per_vault_read_schema_default_shape() -> None:
    """The default per-vault state for an un-touched voce is
    { private_note: null, hidden: false }."""
    from theourgia.api.routers.v1.voces import VocePerVaultRead

    p = VocePerVaultRead(
        voce_id=str(uuid4()),
        owner_id=str(uuid4()),
        private_note=None,
        hidden=False,
    )
    assert p.private_note is None
    assert p.hidden is False


def test_per_vault_upsert_schema_minimal() -> None:
    from theourgia.api.routers.v1.voces import VocePerVaultUpsert

    p = VocePerVaultUpsert()
    assert p.private_note is None
    assert p.hidden is None
    assert p.model_dump(exclude_unset=True) == {}


def test_per_vault_upsert_schema_full() -> None:
    from theourgia.api.routers.v1.voces import VocePerVaultUpsert

    p = VocePerVaultUpsert(
        private_note="Learned at the dark moon",
        hidden=True,
    )
    assert p.private_note == "Learned at the dark moon"
    assert p.hidden is True


def test_per_vault_upsert_rejects_extra_fields() -> None:
    from theourgia.api.routers.v1.voces import VocePerVaultUpsert

    with pytest.raises(ValidationError):
        VocePerVaultUpsert(voce_id=uuid4())  # type: ignore[call-arg]


def test_per_vault_read_rejects_extra_fields() -> None:
    from theourgia.api.routers.v1.voces import VocePerVaultRead

    with pytest.raises(ValidationError):
        VocePerVaultRead(
            voce_id=str(uuid4()),
            owner_id=str(uuid4()),
            private_note=None,
            hidden=False,
            extra=True,  # type: ignore[call-arg]
        )


def test_per_vault_upsert_allows_only_private_note() -> None:
    """Partial updates: passing only private_note should not touch
    hidden. The router applies this rule by checking `is not None`."""
    from theourgia.api.routers.v1.voces import VocePerVaultUpsert

    p = VocePerVaultUpsert(private_note="just notes")
    data = p.model_dump(exclude_unset=True)
    assert data == {"private_note": "just notes"}


def test_per_vault_upsert_allows_only_hidden() -> None:
    from theourgia.api.routers.v1.voces import VocePerVaultUpsert

    p = VocePerVaultUpsert(hidden=True)
    data = p.model_dump(exclude_unset=True)
    assert data == {"hidden": True}


def test_per_vault_model_has_unique_constraint() -> None:
    """The (voce_id, owner_id) uniqueness ensures PUT twice → one
    row, not two."""
    from theourgia.models.voces import VocePerVaultState

    constraints = {
        c.name for c in VocePerVaultState.__table_args__
        if hasattr(c, "name")
    }
    assert "uq_voce_per_vault" in constraints


def test_per_vault_model_defaults_hidden_to_false() -> None:
    """Critical invariant: hidden defaults to False (a brand-new
    voce should not be hidden from its owner)."""
    from theourgia.models.voces import VocePerVaultState

    field = VocePerVaultState.model_fields["hidden"]
    assert field.default is False


def test_voces_router_now_registers_eleven_routes() -> None:
    """B114 adds 2 routes: GET + PUT /per-vault. Total = 11."""
    paths_methods = {
        (r.path, m)
        for r in voces_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/voces/{voce_id}/per-vault", "GET") in paths_methods
    assert ("/voces/{voce_id}/per-vault", "PUT") in paths_methods


def test_list_voces_signature_accepts_include_hidden() -> None:
    """The list endpoint accepts ?include_hidden=true to opt out of
    the hidden filter."""
    import inspect

    sig = inspect.signature(voces_module.list_voces)
    assert "include_hidden" in sig.parameters
    assert sig.parameters["include_hidden"].default is False
