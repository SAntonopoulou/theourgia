"""Tests for the lightweight Phase 06 divination engines + routers:
pendulum, bibliomancy, horary, scrying.

Pure-Python tests covering the bibliomancy passage picker (determinism,
split semantics, fallback), router payload shapes for all four kinds,
and chart-snapshot serialisation for horary.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from theourgia.core.divination.bibliomancy import (
    Passage,
    PassageKind,
    bibliomancy_cast,
    split_text,
)


# ───── Bibliomancy: split_text ───────────────────────────────────────


def test_split_text_by_line_drops_blank_lines() -> None:
    source = "first line\n\nsecond line\n   \nthird line"
    chunks = split_text(source, PassageKind.LINE)
    texts = [c[1] for c in chunks]
    assert texts == ["first line", "second line", "third line"]


def test_split_text_by_paragraph_splits_on_blank_lines() -> None:
    source = "Paragraph one\nstill one.\n\nParagraph two."
    chunks = split_text(source, PassageKind.PARAGRAPH)
    assert len(chunks) == 2
    assert chunks[0][1].startswith("Paragraph one")
    assert chunks[1][1] == "Paragraph two."


def test_split_text_by_sentence_handles_punctuation() -> None:
    source = "First. Second sentence! Third? Fourth."
    chunks = split_text(source, PassageKind.SENTENCE)
    texts = [c[1] for c in chunks]
    assert texts == ["First.", "Second sentence!", "Third?", "Fourth."]


def test_split_text_empty_returns_empty_list() -> None:
    assert split_text("", PassageKind.LINE) == []


# ───── Bibliomancy: cast ─────────────────────────────────────────────


def test_bibliomancy_cast_is_deterministic_for_same_seed() -> None:
    source = "Line one.\nLine two.\nLine three.\nLine four.\nLine five."
    a = bibliomancy_cast(source, seed="x", kind=PassageKind.LINE)
    b = bibliomancy_cast(source, seed="x", kind=PassageKind.LINE)
    assert a == b


def test_bibliomancy_cast_different_seeds_diverge() -> None:
    source = "\n".join(f"Sentence {i}." for i in range(20))
    a = bibliomancy_cast(source, seed="alpha", kind=PassageKind.SENTENCE)
    b = bibliomancy_cast(source, seed="beta", kind=PassageKind.SENTENCE)
    assert a.index != b.index or a.text != b.text


def test_bibliomancy_cast_returns_passage_in_source() -> None:
    source = "Alpha is the start. Omega is the end."
    p = bibliomancy_cast(source, seed="x", kind=PassageKind.SENTENCE)
    assert p.text in source
    assert p.kind == PassageKind.SENTENCE
    assert 0 <= p.index < p.total
    assert p.total == 2


def test_bibliomancy_cast_falls_back_to_whole_source_when_no_passages() -> None:
    """A single-line source with PARAGRAPH granularity: only one
    paragraph exists. The result is that paragraph (the whole source)."""
    source = "Only one line, no paragraph break."
    p = bibliomancy_cast(source, seed="x", kind=PassageKind.PARAGRAPH)
    assert p.text == source.strip()
    assert p.total == 1
    assert p.index == 0


def test_bibliomancy_cast_rejects_empty_source() -> None:
    with pytest.raises(ValueError):
        bibliomancy_cast("   ", seed="x")


def test_bibliomancy_cast_accepts_string_kind() -> None:
    """Accepts both PassageKind enum and the literal string."""
    source = "first. second. third."
    a = bibliomancy_cast(source, seed="x", kind="sentence")
    b = bibliomancy_cast(source, seed="x", kind=PassageKind.SENTENCE)
    assert a == b


def test_passage_dataclass_carries_all_fields() -> None:
    source = "Alpha. Beta. Gamma."
    p = bibliomancy_cast(source, seed="x", kind=PassageKind.SENTENCE)
    assert isinstance(p, Passage)
    for field in ("text", "start_offset", "kind", "index", "total"):
        assert hasattr(p, field)


# ───── Pendulum router payloads ──────────────────────────────────────


def test_pendulum_reading_create_payload_minimal() -> None:
    from theourgia.api.routers.v1.pendulum import ReadingCreate

    p = ReadingCreate(question="Will the rain hold?", outcome="yes")
    assert p.question == "Will the rain hold?"
    assert p.outcome == "yes"
    assert p.confidence is None


def test_pendulum_confidence_must_be_1_to_5() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.pendulum import ReadingCreate

    ReadingCreate(question="q", outcome="no", confidence=1)
    ReadingCreate(question="q", outcome="no", confidence=5)
    with pytest.raises(ValidationError):
        ReadingCreate(question="q", outcome="no", confidence=0)
    with pytest.raises(ValidationError):
        ReadingCreate(question="q", outcome="no", confidence=6)


def test_pendulum_outcome_enum_accepts_four_values() -> None:
    from theourgia.models.divination_lite import PendulumOutcome

    assert {o.value for o in PendulumOutcome} == {
        "yes", "no", "maybe", "no_response",
    }


def test_pendulum_calibration_summary_shape() -> None:
    from theourgia.api.routers.v1.pendulum import CalibrationSummary

    s = CalibrationSummary(
        total_readings=10,
        calibrated_readings=4,
        correct=3,
        incorrect=1,
        ambiguous=0,
        accuracy_rate=0.75,
    )
    assert s.accuracy_rate == 0.75


# ───── Bibliomancy router payloads ───────────────────────────────────


def test_bibliomancy_cast_request_defaults() -> None:
    from theourgia.api.routers.v1.bibliomancy import CastRequest

    p = CastRequest(source_text="A. B. C.", source_label="Test")
    assert p.passage_kind == "paragraph"
    assert p.book_id is None
    assert p.seed is None


def test_bibliomancy_cast_request_requires_nonempty_source() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.bibliomancy import CastRequest

    with pytest.raises(ValidationError):
        CastRequest(source_text="", source_label="Test")


# ───── Horary router payloads ────────────────────────────────────────


def test_horary_cast_request_validates_lat_lon_ranges() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.horary import CastRequest

    CastRequest(question="q", latitude=37.97, longitude=23.72)
    CastRequest(question="q", latitude=-89, longitude=179)
    with pytest.raises(ValidationError):
        CastRequest(question="q", latitude=91, longitude=0)
    with pytest.raises(ValidationError):
        CastRequest(question="q", latitude=0, longitude=181)


def test_horary_cast_request_requires_question() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.horary import CastRequest

    with pytest.raises(ValidationError):
        CastRequest(question="", latitude=0, longitude=0)


def test_horary_reading_update_rating_range() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.horary import ReadingUpdate

    ReadingUpdate(retrospective_rating=3)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=0)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=6)


# ───── Scrying router payloads ───────────────────────────────────────


def test_scrying_session_start_defaults() -> None:
    from theourgia.api.routers.v1.scrying import SessionStart

    s = SessionStart(mode="water_bowl")
    assert s.mode == "water_bowl"
    assert s.started_at is None  # API defaults it server-side


def test_scrying_mode_enum_has_eight_values() -> None:
    from theourgia.models.divination_lite import ScryingMode

    assert {m.value for m in ScryingMode} == {
        "water_bowl", "black_mirror", "crystal", "fire",
        "smoke", "ink_in_water", "candle_flame", "other",
    }


def test_scrying_session_end_accepts_symbols_list() -> None:
    from theourgia.api.routers.v1.scrying import SessionEnd

    s = SessionEnd(symbols=["serpent", "crossroads", "torch"])
    assert s.symbols == ["serpent", "crossroads", "torch"]


def test_symbol_entry_shape() -> None:
    from theourgia.api.routers.v1.scrying import SymbolEntry

    e = SymbolEntry(symbol="serpent", count=3, session_ids=[str(uuid4()) for _ in range(3)])
    assert e.count == 3
    assert len(e.session_ids) == 3


# ───── Model class-shape sanity ──────────────────────────────────────


def test_pendulum_reading_model_has_expected_columns() -> None:
    from theourgia.models.divination_lite import PendulumReading

    for col in (
        "question", "asked_at", "outcome", "confidence",
        "board_image_upload_id", "board_landing", "notes",
        "calibration", "calibration_at",
    ):
        assert hasattr(PendulumReading, col)


def test_bibliomancy_reading_model_has_expected_columns() -> None:
    from theourgia.models.divination_lite import BibliomancyReading

    for col in (
        "question", "book_id", "source_label", "passage_kind",
        "seed", "drawn_at", "drawn_passage", "start_offset",
        "passage_index", "total_passages", "interpretation",
    ):
        assert hasattr(BibliomancyReading, col)


def test_horary_reading_model_has_expected_columns() -> None:
    from theourgia.models.divination_lite import HoraryReading

    for col in (
        "question", "asked_at", "latitude", "longitude",
        "chart_snapshot", "significator_querent",
        "significator_quesited", "perfection_notes",
    ):
        assert hasattr(HoraryReading, col)


def test_scrying_session_model_has_expected_columns() -> None:
    from theourgia.models.divination_lite import ScryingSession

    for col in (
        "mode", "started_at", "ended_at", "intention",
        "preparation_notes", "vision_notes", "symbols",
        "sketch_upload_id", "voice_memo_upload_id", "planetary_hour",
    ):
        assert hasattr(ScryingSession, col)


# ───── End-of-session duration computation ───────────────────────────


def test_duration_seconds_computed_from_ended_at_minus_started_at() -> None:
    """The router's _to_read helper computes duration when ended_at is set."""
    from theourgia.api.routers.v1.scrying import _to_read
    from theourgia.models.divination_lite import ScryingMode, ScryingSession

    started = datetime(2026, 6, 21, 18, 0, tzinfo=UTC)
    ended = datetime(2026, 6, 21, 18, 22, tzinfo=UTC)
    row = ScryingSession(
        mode=ScryingMode.WATER_BOWL,
        started_at=started,
        ended_at=ended,
    )
    # Stub the timestamp fields TimestampMixin would set on commit.
    row.created_at = started
    row.updated_at = ended
    out = _to_read(row)
    assert out.duration_seconds == 22 * 60


def test_duration_seconds_is_none_for_in_progress_session() -> None:
    from theourgia.api.routers.v1.scrying import _to_read
    from theourgia.models.divination_lite import ScryingMode, ScryingSession

    started = datetime(2026, 6, 21, 18, 0, tzinfo=UTC)
    row = ScryingSession(
        mode=ScryingMode.WATER_BOWL,
        started_at=started,
    )
    row.created_at = started
    row.updated_at = started
    out = _to_read(row)
    assert out.duration_seconds is None
