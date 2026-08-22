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


# ─── spiritual maps ─────────────────────────────────────────────────


def test_spiritual_map_needs_a_name_and_node_names() -> None:
    from theourgia.api.routers.v1.user_settings import (
        SpiritualMapModel,
        SpiritualMapNodeModel,
    )

    with pytest.raises(ValidationError):
        SpiritualMapModel(id="m", name="")  # empty name
    with pytest.raises(ValidationError):
        SpiritualMapNodeModel(id="n", name="")  # empty node name


def test_maps_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/maps" in paths


@pytest.mark.anyio
async def test_read_maps_defaults_empty() -> None:
    from theourgia.api.routers.v1.user_settings import read_maps

    assert await read_maps(_Session(None), "u") == []


@pytest.mark.anyio
async def test_read_maps_parses_and_drops_bad() -> None:
    import json

    from theourgia.api.routers.v1.user_settings import read_maps

    good = {
        "id": "map1",
        "name": "The Tree",
        "summary": "",
        "nodes": [{"id": "kether", "name": "Kether", "note": "The crown"}],
    }
    row = _Row(json.dumps([good, {"id": "m2"}, 7]))
    maps = await read_maps(_Session(row), "u")
    assert [m.id for m in maps] == ["map1"]
    assert maps[0].nodes[0].name == "Kether"


# ─── correspondence charts v2 (the phone's §10, mirrored) ───────────


def test_chart_cell_refuses_a_blank_value() -> None:
    # A blank cell is the ABSENT entry — an empty string may never pose as one.
    from theourgia.api.routers.v1.user_settings import ChartCellModel

    with pytest.raises(ValidationError):
        ChartCellModel(value="")


def test_chart_column_without_a_source_is_allowed() -> None:
    # Absent source reads as the practitioner's own claim, never anonymous.
    from theourgia.api.routers.v1.user_settings import ChartColumnModel

    column = ChartColumnModel(id="c1", caption="Metals")
    assert column.source is None
    assert column.categoryKey is None


def test_charts_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/correspondence-charts" in paths


class _SeqSession:
    """Answers successive queries with successive preset rows."""

    def __init__(self, *rows: object) -> None:
        self._rows = list(rows)

    async def execute(self, *_a: object, **_k: object) -> _Result:
        return _Result(self._rows.pop(0))


@pytest.mark.anyio
async def test_read_charts_defaults_to_legacy_conversion() -> None:
    # With nothing under the new key, the old free-form tables come back as
    # custom-scale charts: subjects → rows, bare captions → sourceless
    # columns, blank cells not carried. Stable ids, so a second read agrees.
    import json

    from theourgia.api.routers.v1.user_settings import read_correspondence_charts

    legacy = {
        "id": "t1",
        "title": "My 777",
        "columns": ["Metal", "Stone"],
        "rows": [
            {"subject": "Mars", "cells": {"Metal": "Iron", "Stone": ""}},
            {"subject": "Luna", "cells": {"Stone": "Moonstone"}},
        ],
    }
    charts = await read_correspondence_charts(
        _SeqSession(None, _Row(json.dumps([legacy]))), "u"
    )
    assert [c.id for c in charts] == ["t1"]
    chart = charts[0]
    assert chart.scaleFamily is None
    assert [r.label for r in chart.rows] == ["Mars", "Luna"]
    assert [c.caption for c in chart.columns] == ["Metal", "Stone"]
    assert all(c.source is None for c in chart.columns)
    metal, stone = chart.columns
    assert chart.cells[metal.id][chart.rows[0].key].value == "Iron"
    # The blank Stone cell for Mars was never a value; only Luna's survives.
    assert chart.cells[stone.id] == {
        chart.rows[1].key: chart.cells[stone.id][chart.rows[1].key]
    }
    assert chart.cells[stone.id][chart.rows[1].key].value == "Moonstone"


@pytest.mark.anyio
async def test_read_charts_prefers_the_new_key_and_drops_bad() -> None:
    import json

    from theourgia.api.routers.v1.user_settings import read_correspondence_charts

    good = {
        "id": "ch1",
        "name": "Planetary table",
        "scaleFamily": "planet",
        "columns": [
            {
                "id": "c1",
                "caption": "Metals",
                "source": {"title": "Occult Philosophy", "author": "Agrippa", "year": 1533},
                "categoryKey": "metal",
            }
        ],
        "cells": {"c1": {"planet.mars": {"value": "Iron"}}},
    }
    row = _Row(json.dumps([good, {"id": "broken"}, 7]))
    charts = await read_correspondence_charts(_Session(row), "u")
    assert [c.id for c in charts] == ["ch1"]
    assert charts[0].columns[0].source.author == "Agrippa"
    assert charts[0].cells["c1"]["planet.mars"].value == "Iron"


@pytest.mark.anyio
async def test_charts_put_rejects_duplicate_chart_ids() -> None:
    from theourgia.api.errors import ValidationFailedError
    from theourgia.api.routers.v1.user_settings import (
        CorrespondenceChartModel,
        CorrespondenceChartsWrite,
        put_my_correspondence_charts,
    )

    class _User:
        id = "u"

    payload = CorrespondenceChartsWrite(
        charts=[
            CorrespondenceChartModel(id="ch1", name="A"),
            CorrespondenceChartModel(id="ch1", name="B"),
        ]
    )
    # The guard raises before the db is ever touched.
    with pytest.raises(ValidationFailedError):
        await put_my_correspondence_charts(payload, None, _User())


@pytest.mark.anyio
async def test_charts_put_rejects_cells_naming_a_missing_column() -> None:
    from theourgia.api.errors import ValidationFailedError
    from theourgia.api.routers.v1.user_settings import (
        ChartColumnModel,
        CorrespondenceChartModel,
        CorrespondenceChartsWrite,
        put_my_correspondence_charts,
    )

    class _User:
        id = "u"

    payload = CorrespondenceChartsWrite(
        charts=[
            CorrespondenceChartModel(
                id="ch1",
                name="T",
                scaleFamily="planet",
                columns=[ChartColumnModel(id="c1", caption="A")],
                cells={"ghost": {"planet.mars": {"value": "X"}}},
            )
        ]
    )
    with pytest.raises(ValidationFailedError):
        await put_my_correspondence_charts(payload, None, _User())


@pytest.mark.anyio
async def test_charts_put_refuses_a_mapped_column_on_a_custom_scale() -> None:
    # Mirrored from the phone: a custom scale never leaks into the lookup.
    from theourgia.api.errors import ValidationFailedError
    from theourgia.api.routers.v1.user_settings import (
        ChartColumnModel,
        CorrespondenceChartModel,
        CorrespondenceChartsWrite,
        put_my_correspondence_charts,
    )

    class _User:
        id = "u"

    payload = CorrespondenceChartsWrite(
        charts=[
            CorrespondenceChartModel(
                id="ch1",
                name="Free-form",
                columns=[ChartColumnModel(id="c1", caption="C", categoryKey="metal")],
            )
        ]
    )
    with pytest.raises(ValidationFailedError):
        await put_my_correspondence_charts(payload, None, _User())


# ─── astro.doctrine — the contested-doctrine choices ─────────────────────


def test_astro_doctrine_defaults_are_the_ledger() -> None:
    # The defaults recorded in the phone repo's ASTRO-DOCTRINE-DECISIONS.md.
    from theourgia.api.routers.v1.user_settings import AstroDoctrineModel

    d = AstroDoctrineModel()
    assert d.solar_phase == "paulus"
    assert d.predominator == "valensWholeSign"
    assert d.exaltation_degrees == "signLevel"
    assert d.saturn_exaltation_degree == 21
    assert d.venus_exaltation_degree == 27
    assert d.maltreatment_contested_sextile is True
    assert d.void_of_course == "thirtyDegrees"


def test_astro_doctrine_values_are_the_phone_enum_names() -> None:
    # The setting syncs to the phone, whose Dart enums parse these verbatim.
    from theourgia.api.routers.v1.user_settings import AstroDoctrineModel

    predominator = AstroDoctrineModel.model_fields["predominator"]
    args = predominator.annotation.__args__
    assert set(args) == {
        "porphyry",
        "dorotheus",
        "valensWholeSign",
        "valensQuadrant",
        "ptolemy",
        "paulus",
    }


def test_astro_doctrine_saturn_degree_must_be_attested() -> None:
    # 21 (majority) and 20 (Paulus via George) stand; 19 is the OCR artefact
    # George's Table 15 scan produced and must never be storable as doctrine.
    from theourgia.api.routers.v1.user_settings import AstroDoctrineModel

    assert AstroDoctrineModel(saturn_exaltation_degree=20).saturn_exaltation_degree == 20
    with pytest.raises(ValidationError):
        AstroDoctrineModel(saturn_exaltation_degree=19)


def test_astro_doctrine_venus_degree_must_be_attested() -> None:
    from theourgia.api.routers.v1.user_settings import AstroDoctrineModel

    assert AstroDoctrineModel(venus_exaltation_degree=26).venus_exaltation_degree == 26
    with pytest.raises(ValidationError):
        AstroDoctrineModel(venus_exaltation_degree=25)


def test_astro_doctrine_degree_options_come_from_the_engine() -> None:
    # The validator reads the hellenistic module's attested variants, so the
    # setting can never drift from what the canon actually records.
    from theourgia.api.routers.v1.user_settings import _attested_exaltation_degrees
    from theourgia.core.astro.hellenistic.bodies import Planet

    assert _attested_exaltation_degrees(Planet.SATURN) == frozenset({21, 20})
    assert _attested_exaltation_degrees(Planet.VENUS) == frozenset({27, 26})


def test_astro_doctrine_rejects_extras() -> None:
    from theourgia.api.routers.v1.user_settings import AstroDoctrineModel

    with pytest.raises(ValidationError):
        AstroDoctrineModel(house_system="placidus")


def test_astro_doctrine_route_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/users/me/settings/astro-doctrine" in paths


@pytest.mark.anyio
async def test_read_astro_doctrine_defaults_when_unset() -> None:
    from theourgia.api.routers.v1.user_settings import read_astro_doctrine

    d = await read_astro_doctrine(_Session(None), "user-1")
    assert d.predominator == "valensWholeSign"


@pytest.mark.anyio
async def test_read_astro_doctrine_salvages_field_by_field() -> None:
    # One malformed choice falls back to its default without dragging the
    # user's other rulings down with it.
    import json

    from theourgia.api.routers.v1.user_settings import read_astro_doctrine

    stored = {
        "solar_phase": "lilly1647",
        "saturn_exaltation_degree": 19,  # the rejected artefact
        "void_of_course": "signExit",
        "some_future_field": "ignored",
    }
    d = await read_astro_doctrine(_Session(_Row(json.dumps(stored))), "user-1")
    assert d.solar_phase == "lilly1647"
    assert d.void_of_course == "signExit"
    assert d.saturn_exaltation_degree == 21


@pytest.mark.anyio
async def test_read_astro_doctrine_tolerates_garbage() -> None:
    from theourgia.api.routers.v1.user_settings import read_astro_doctrine

    d = await read_astro_doctrine(_Session(_Row("not json")), "user-1")
    assert d.solar_phase == "paulus"
    d = await read_astro_doctrine(_Session(_Row('["a list"]')), "user-1")
    assert d.exaltation_degrees == "signLevel"
