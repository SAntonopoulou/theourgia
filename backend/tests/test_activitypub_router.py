"""ActivityPub router schema + helper tests.

Phase 13 stub follow-on. The honesty invariants:

  · DEFAULT_OBJECT_TYPE_MAPPING matches the H08 surface 16
    seed: entries→Article · notes→Note · rituals→Event ·
    publications→Article.
  · SettingsUpdate is all-optional + extra-forbidden.
  · State filter on /follow-requests accepts only "pending" /
    "all".
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.activitypub import (
    DEFAULT_OBJECT_TYPE_MAPPING,
    SettingsRead,
    SettingsUpdate,
)


def test_default_object_type_mapping_matches_h08_brief() -> None:
    """H08 surface 16 seed — verbatim."""
    assert DEFAULT_OBJECT_TYPE_MAPPING == {
        "entries": "Article",
        "notes": "Note",
        "rituals": "Event",
        "publications": "Article",
    }


def test_settings_update_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SettingsUpdate(  # type: ignore[call-arg]
            enabled=True,
            sneaky=True,
        )


def test_settings_update_all_optional() -> None:
    SettingsUpdate()


def test_settings_update_display_name_max_length() -> None:
    SettingsUpdate(display_name_override="x" * 255)
    with pytest.raises(ValidationError):
        SettingsUpdate(display_name_override="x" * 256)


def test_settings_update_bio_max_length() -> None:
    SettingsUpdate(bio_override="x" * 2000)
    with pytest.raises(ValidationError):
        SettingsUpdate(bio_override="x" * 2001)


def test_settings_read_extra_forbidden() -> None:
    """The read shape rejects unknown fields — defence in depth
    against accidental data leak."""
    with pytest.raises(ValidationError):
        SettingsRead(  # type: ignore[call-arg]
            enabled=False,
            display_name_override=None,
            bio_override=None,
            follower_approval="manual",  # type: ignore[arg-type]
            broadcast_creates=True,
            broadcast_updates=True,
            broadcast_deletes=False,
            object_type_mapping={},
            created_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            updated_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            sneaky=True,
        )
