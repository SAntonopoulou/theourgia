"""Rite liturgy serving tests — both-mode invocations on the wire.

* ``/resh/config`` carries ``effective_stations`` with BOTH liturgy
  forms per station (``invocation: {home, xenos}``) for the override
  editor; a plain-string override stays legal and covers both modes.
* ``/resh/today`` serves each station's invocation in the relevant
  mode: the station's observed mode wins, else the day's mode, else
  ``home``.
* Greek text survives the HTTP round-trip byte-exact (codepoint
  comparison against the shipped liturgy JSON — no NFC/NFD drift).

Model-level tests run everywhere; full HTTP round-trips are
skip-gated on ``THEOURGIA_TEST_DATABASE_URL`` (database migrated to
head), same shape as the rest of the suite.
"""

from __future__ import annotations

import json
from datetime import date
from importlib import resources

import pytest

from tests.sprint_ib_db import DB_URL, signed_in_client
from theourgia.api.routers.v1.resh import (
    RiteConfig,
    RiteConfigWrite,
    StationOverride,
    _station_forms,
)

ATHENS = {"lat": 37.9838, "lng": 23.7275}


def _liturgy() -> dict:
    raw = (
        resources.files("theourgia")
        .joinpath("data/hellenic_rite_liturgy.json")
        .read_text(encoding="utf-8")
    )
    return json.loads(raw)


def _codepoints(text: str) -> list[int]:
    return [ord(c) for c in text]


# ───── Model-level (no DB) ──────────────────────────────────────────────


def test_config_effective_stations_carry_both_forms() -> None:
    config = RiteConfig(preset="hellenic", minimum_viable_station="sunset")
    forms = _station_forms(config)
    assert set(forms) == {"sunrise", "noon", "sunset", "midnight"}
    for station in forms.values():
        assert set(station.invocation) == {"home", "xenos"}

    dusk = _liturgy()["stations"]["dusk"]
    assert _codepoints(forms["sunset"].invocation["home"]) == _codepoints(
        dusk["home"]["invocation"]
    )
    assert _codepoints(forms["sunset"].invocation["xenos"]) == _codepoints(
        dusk["xenos"]["invocation"]
    )


def test_plain_string_override_covers_both_modes() -> None:
    """Backward-compatible override shape: a single string replaces the
    invocation for BOTH modes; other stations keep their two forms."""
    config = RiteConfig(
        preset="hellenic",
        minimum_viable_station="sunset",
        stations={"noon": StationOverride(short_invocation="My own line.")},
    )
    forms = _station_forms(config)
    assert forms["noon"].invocation == {
        "home": "My own line.",
        "xenos": "My own line.",
    }
    assert forms["sunset"].invocation["home"] != forms["sunset"].invocation["xenos"]


def test_thelemic_config_serves_single_form_for_both_modes() -> None:
    config = RiteConfig(preset="thelemic", minimum_viable_station="sunset")
    forms = _station_forms(config)
    for station in forms.values():
        assert station.invocation["home"] == station.invocation["xenos"]
    assert "Ra" in forms["sunrise"].invocation["home"]


def test_rite_config_json_serialization_is_codepoint_exact() -> None:
    """Pydantic + JSON encoding must not renormalize the Greek."""
    config = RiteConfig(preset="hellenic", minimum_viable_station="sunset")
    config.effective_stations = _station_forms(config)  # type: ignore[assignment]
    wire = json.loads(config.model_dump_json())
    served = wire["effective_stations"]["sunset"]["invocation"]["home"]
    expected = _liturgy()["stations"]["dusk"]["home"]["invocation"]
    assert _codepoints(served) == _codepoints(expected)
    assert "ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ" in served
    assert "\u03a7\u03b1\u1fd6\u03c1\u03b5" in served  # precomposed Χαῖρε
    assert "\u0342" not in served  # no NFD decomposition drift


def test_rite_config_write_accepts_echoed_effective_stations() -> None:
    """A GET body echoed back to PUT must validate (the read-only field
    is accepted and ignored)."""
    config = RiteConfig(preset="hellenic", minimum_viable_station="sunset")
    config.effective_stations = _station_forms(config)  # type: ignore[assignment]
    echoed = RiteConfigWrite.model_validate(json.loads(config.model_dump_json()))
    assert echoed.preset == "hellenic"


# ───── HTTP round-trips (live DB) ───────────────────────────────────────


@pytest.mark.anyio
@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
async def test_config_and_today_roundtrip_serves_mode_liturgy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The full wire round-trip: config carries both forms byte-exact;
    today serves home by default, then follows the observed mode."""
    liturgy = _liturgy()["stations"]
    dusk_home = liturgy["dusk"]["home"]["invocation"]
    dusk_xenos = liturgy["dusk"]["xenos"]["invocation"]
    dawn_xenos = liturgy["dawn"]["xenos"]["invocation"]
    on_date = date(2026, 6, 21).isoformat()

    async with signed_in_client(monkeypatch) as client:
        # Config: both forms, byte-exact.
        r = await client.get("/api/v1/resh/config")
        assert r.status_code == 200, r.text
        config = r.json()
        assert config["preset"] == "hellenic"
        sunset = config["effective_stations"]["sunset"]
        assert set(sunset["invocation"]) == {"home", "xenos"}
        assert _codepoints(sunset["invocation"]["home"]) == _codepoints(dusk_home)
        assert _codepoints(sunset["invocation"]["xenos"]) == _codepoints(dusk_xenos)
        assert "ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ" in sunset["invocation"]["home"]
        assert "\u03a7\u03b1\u1fd6\u03c1\u03b5" in sunset["invocation"]["home"]
        assert "\u0342" not in sunset["invocation"]["home"]

        # Today, nothing observed: every station serves its HOME form.
        r = await client.get(
            "/api/v1/resh/today", params={**ATHENS, "date": on_date},
        )
        assert r.status_code == 200, r.text
        today = r.json()
        assert today["mode"] is None
        by_transition = {s["transition"]: s for s in today["stations"]}
        assert _codepoints(by_transition["sunset"]["short_invocation"]) == _codepoints(
            dusk_home
        )

        # Observe dusk in XENOS mode → dusk serves the xenos form, the
        # day's mode is xenos, and unobserved stations follow the day.
        r = await client.post(
            "/api/v1/resh/adorations",
            json={"transition": "sunset", "mode": "xenos", "civil_date": on_date},
        )
        assert r.status_code == 201, r.text

        r = await client.get(
            "/api/v1/resh/today", params={**ATHENS, "date": on_date},
        )
        assert r.status_code == 200, r.text
        today = r.json()
        assert today["mode"] == "xenos"
        by_transition = {s["transition"]: s for s in today["stations"]}
        assert by_transition["sunset"]["mode"] == "xenos"
        assert _codepoints(by_transition["sunset"]["short_invocation"]) == _codepoints(
            dusk_xenos
        )
        assert by_transition["sunrise"]["mode"] is None
        assert _codepoints(by_transition["sunrise"]["short_invocation"]) == _codepoints(
            dawn_xenos
        )


@pytest.mark.anyio
@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
async def test_config_override_roundtrip_keeps_other_stations_exact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """PUT an override, GET it back: the override covers both modes and
    the untouched Greek stays byte-exact."""
    dusk_home = _liturgy()["stations"]["dusk"]["home"]["invocation"]

    async with signed_in_client(monkeypatch) as client:
        r = await client.put(
            "/api/v1/resh/config",
            json={"stations": {"noon": {"short_invocation": "Hail Helios."}}},
        )
        assert r.status_code == 200, r.text
        config = r.json()
        assert config["effective_stations"]["noon"]["invocation"] == {
            "home": "Hail Helios.",
            "xenos": "Hail Helios.",
        }
        assert _codepoints(
            config["effective_stations"]["sunset"]["invocation"]["home"]
        ) == _codepoints(dusk_home)

        # Clearing the override map restores the preset's two forms.
        r = await client.put("/api/v1/resh/config", json={"stations": {}})
        assert r.status_code == 200, r.text
        noon = r.json()["effective_stations"]["noon"]
        assert noon["invocation"]["home"] != noon["invocation"]["xenos"]
