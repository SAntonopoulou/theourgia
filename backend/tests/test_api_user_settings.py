"""User-settings router shape tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.user_settings import (
    DEFAULT_LAT,
    DEFAULT_LNG,
    LAT_KEY,
    LNG_KEY,
    LocationRead,
    LocationWrite,
)


def test_default_location_is_greenwich() -> None:
    assert DEFAULT_LAT == 51.4769
    assert DEFAULT_LNG == 0.0


def test_setting_keys_use_astro_namespace() -> None:
    assert LAT_KEY == "astro.lat"
    assert LNG_KEY == "astro.lng"


def test_location_read_round_trips() -> None:
    loc = LocationRead(lat=51.5, lng=-0.1)
    assert loc.model_dump() == {"lat": 51.5, "lng": -0.1}


@pytest.mark.parametrize(
    "lat,lng",
    [(-91, 0), (91, 0), (0, -181), (0, 181), (1000, 1000)],
)
def test_location_write_rejects_out_of_range(lat: float, lng: float) -> None:
    with pytest.raises(ValidationError):
        LocationWrite(lat=lat, lng=lng)


def test_location_write_rejects_extras() -> None:
    with pytest.raises(ValidationError):
        LocationWrite(lat=0, lng=0, altitude=100)  # type: ignore[call-arg]


def test_user_settings_router_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/users/me/settings/location" in paths


# ─── built-in practice toggles (web parity with the phone) ──────────


def test_practice_catalog_matches_the_phone_enum() -> None:
    # These key strings are a cross-repo contract: the phone writes them as
    # `practice.enabled.<key>`. If this set ever drifts from the phone enum,
    # a toggle on one surface would mean nothing on the other.
    from theourgia.core.practices_catalog import PRACTICE_KEYS

    assert {
        "lunarAdorations",
        "solarAdorations",
        "rituals",
        "workings",
        "meditation",
        "pranayama",
        "divination",
        "numbers",
    } == PRACTICE_KEYS


def test_practice_catalog_has_no_duplicate_keys() -> None:
    from theourgia.core.practices_catalog import PRACTICES

    keys = [p.key for p in PRACTICES]
    assert len(keys) == len(set(keys))


def test_numbers_is_never_labelled_numerology() -> None:
    # The phone's doc-comment is explicit that gematria/isopsephy/ʿilm al-ḥurūf
    # are not "numerology"; the two surfaces must read the same.
    from theourgia.core.practices_catalog import practice_for

    numbers = practice_for("numbers")
    assert numbers is not None
    assert "numerolog" not in numbers.label.lower()


def test_practices_write_defaults_to_nothing_disabled() -> None:
    from theourgia.api.routers.v1.user_settings import PracticesWrite

    assert PracticesWrite().disabled == []


def test_practices_write_rejects_extras() -> None:
    from theourgia.api.routers.v1.user_settings import PracticesWrite

    with pytest.raises(ValidationError):
        PracticesWrite(disabled=[], mystery=1)  # type: ignore[call-arg]


def test_practices_route_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/practices" in paths


class _Row:
    def __init__(self, value_json: str) -> None:
        self.value_json = value_json


class _Result:
    def __init__(self, row: object) -> None:
        self._row = row

    def scalar_one_or_none(self) -> object:
        return self._row


class _Session:
    """A session that answers one query with a preset row."""

    def __init__(self, row: object) -> None:
        self._row = row

    async def execute(self, *_a: object, **_k: object) -> _Result:
        return _Result(self._row)


@pytest.mark.anyio
async def test_read_disabled_practices_defaults_to_none_off() -> None:
    from theourgia.api.routers.v1.user_settings import read_disabled_practices

    # No stored row → nothing disabled → all eight on.
    assert await read_disabled_practices(_Session(None), "u") == set()


@pytest.mark.anyio
async def test_read_disabled_practices_drops_unknown_keys() -> None:
    import json

    from theourgia.api.routers.v1.user_settings import read_disabled_practices

    row = _Row(json.dumps(["divination", "a-since-removed-practice"]))
    # The stale key is silently ignored; the live one survives.
    assert await read_disabled_practices(_Session(row), "u") == {"divination"}


@pytest.mark.anyio
async def test_read_disabled_practices_tolerates_garbage() -> None:
    from theourgia.api.routers.v1.user_settings import read_disabled_practices

    assert await read_disabled_practices(_Session(_Row("not json")), "u") == set()


# ─── custom correspondence tables ───────────────────────────────────


def test_correspondence_table_needs_a_title() -> None:
    from theourgia.api.routers.v1.user_settings import CustomCorrespondenceTable

    with pytest.raises(ValidationError):
        CustomCorrespondenceTable(id="a", title="", columns=[], rows=[])


def test_correspondences_write_defaults_to_no_tables() -> None:
    from theourgia.api.routers.v1.user_settings import CorrespondencesWrite

    assert CorrespondencesWrite().tables == []


def test_correspondences_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/correspondences" in paths


@pytest.mark.anyio
async def test_read_custom_correspondences_defaults_empty() -> None:
    from theourgia.api.routers.v1.user_settings import read_custom_correspondences

    assert await read_custom_correspondences(_Session(None), "u") == []


@pytest.mark.anyio
async def test_read_custom_correspondences_parses_and_drops_bad_tables() -> None:
    import json

    from theourgia.api.routers.v1.user_settings import read_custom_correspondences

    good = {
        "id": "t1",
        "title": "My 777",
        "columns": ["Metal", "Colour"],
        "rows": [{"subject": "Mars", "cells": {"Metal": "Iron", "Colour": "Red"}}],
    }
    bad = {"id": "t2", "title": ""}  # empty title — refused
    row = _Row(json.dumps([good, bad, "not-a-table"]))
    tables = await read_custom_correspondences(_Session(row), "u")
    assert [t.id for t in tables] == ["t1"]
    assert tables[0].rows[0].cells["Metal"] == "Iron"


# ─── adoration sets ─────────────────────────────────────────────────


def test_adoration_set_needs_a_name_and_body() -> None:
    from theourgia.api.routers.v1.user_settings import AdorationSetModel

    with pytest.raises(ValidationError):
        AdorationSetModel(id="a", name="", body="lunar")  # empty name
    with pytest.raises(ValidationError):
        AdorationSetModel(id="a", name="Hekate", body="mars")  # bad body


def test_adorations_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/adorations" in paths


@pytest.mark.anyio
async def test_read_adoration_sets_defaults_empty() -> None:
    from theourgia.api.routers.v1.user_settings import read_adoration_sets

    assert await read_adoration_sets(_Session(None), "u") == []


@pytest.mark.anyio
async def test_read_adoration_sets_parses_and_drops_bad() -> None:
    import json

    from theourgia.api.routers.v1.user_settings import read_adoration_sets

    good = {
        "id": "s1",
        "name": "Hekate",
        "body": "lunar",
        "active": True,
        "stations": {"moonrise": "Hekate Phosphoros"},
    }
    row = _Row(json.dumps([good, {"id": "s2"}, 3]))
    sets = await read_adoration_sets(_Session(row), "u")
    assert [s.id for s in sets] == ["s1"]
    assert sets[0].stations["moonrise"] == "Hekate Phosphoros"
