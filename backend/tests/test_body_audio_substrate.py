"""Phase 04 body + audio substrate tests.

Pure-Python model-shape tests. The frontend renderers (SVG
silhouettes for body, MediaRecorder UI for audio) are designer
hand-offs (designer_handoff_02.handoff §6 + §7); these tests cover
only the data layer.
"""

from __future__ import annotations

import json

from theourgia.models.audio import AudioAttachment
from theourgia.models.body import BodySnapshot


# ───── BodySnapshot ─────────────────────────────────────────────────────


def test_body_snapshot_construct_with_no_markers() -> None:
    """A snapshot can be empty — "I felt nothing in particular" is a
    valid record.
    """
    snap = BodySnapshot(label="Pre-working baseline", markers_json="[]")
    assert snap.markers_json == "[]"
    assert json.loads(snap.markers_json) == []


def test_body_snapshot_carries_marker_set() -> None:
    """Round-trip a marker set through the JSON column."""
    markers = [
        {
            "silhouette": "front",
            "x": 0.5,
            "y": 0.25,
            "sensation": "warmth",
            "intensity": 7,
            "color": "#c7a24c",
            "note": "Centred at the heart.",
        },
        {
            "silhouette": "back",
            "x": 0.5,
            "y": 0.5,
            "sensation": "pressure",
            "intensity": 4,
            "color": "#5e9ba6",
            "note": "",
        },
    ]
    snap = BodySnapshot(
        label="During Hekate invocation",
        markers_json=json.dumps(markers),
        notes="Steady throughout.",
    )
    parsed = json.loads(snap.markers_json)
    assert len(parsed) == 2
    assert parsed[0]["sensation"] == "warmth"
    assert parsed[1]["silhouette"] == "back"


def test_body_snapshot_default_morphology() -> None:
    """default body_morphology = 'default' (the neutral silhouette set)."""
    snap = BodySnapshot(label="x", markers_json="[]")
    assert snap.body_morphology == "default"


def test_body_snapshot_accepts_plugin_morphology() -> None:
    """A plugin can register an alternate silhouette set and reference
    it via the body_morphology column.
    """
    snap = BodySnapshot(
        label="x",
        markers_json="[]",
        body_morphology="plugin:my-set",
    )
    assert snap.body_morphology == "plugin:my-set"


# ───── AudioAttachment ──────────────────────────────────────────────────


def test_audio_attachment_construct_minimal() -> None:
    """upload_id is required (FK to Upload); the rest defaults."""
    attachment = AudioAttachment(
        upload_id="00000000-0000-0000-0000-000000000000",
    )
    assert attachment.duration_seconds == 0.0
    assert attachment.mime_type == "audio/ogg"
    assert attachment.transcript is None
    assert attachment.transcript_engine is None


def test_audio_attachment_carries_full_metadata() -> None:
    attachment = AudioAttachment(
        entry_id="11111111-1111-1111-1111-111111111111",
        upload_id="22222222-2222-2222-2222-222222222222",
        duration_seconds=42.7,
        mime_type="audio/webm",
        transcript="Once, in the temple of …",
        transcript_engine="whisper:large-v3",
        label="Field recording",
    )
    assert attachment.duration_seconds == 42.7
    assert attachment.transcript_engine == "whisper:large-v3"


def test_audio_attachment_decouples_from_entry_until_associated() -> None:
    """entry_id is nullable: a draft recording exists before being
    attached to a journal entry.
    """
    attachment = AudioAttachment(
        upload_id="33333333-3333-3333-3333-333333333333",
    )
    assert attachment.entry_id is None


# ───── Provenance / design-independence ─────────────────────────────────


def test_body_snapshot_schema_is_designer_independent() -> None:
    """Marker shape is documented as silhouette/x/y/sensation/intensity
    /color/note — independent of the SVG art. This test asserts the
    column exists and accepts JSON; the actual silhouette files come
    from designer hand-off and are loaded at render time.
    """
    snap = BodySnapshot(label="x", markers_json='[{"silhouette":"front","x":0.1,"y":0.2,"sensation":"pulling","intensity":3,"color":"#000","note":""}]')
    marker = json.loads(snap.markers_json)[0]
    assert "silhouette" in marker
    assert "x" in marker
    assert "y" in marker
    assert "sensation" in marker
    assert "intensity" in marker
    assert "color" in marker
