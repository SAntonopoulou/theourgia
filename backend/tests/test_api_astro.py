"""Tests for the astrology / calendar / events API.

Validates the Pydantic schemas + the FastAPI route shape via
TestClient. Each endpoint smoke-tests the happy path; the underlying
computational correctness is covered by the unit-level test files
(test_calendars / test_astro / test_astro_time / test_festivals /
test_election).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
import pytest

from theourgia.api.app import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


ATHENS_LAT = 37.9838
ATHENS_LON = 23.7275


# ───── /calendar/today ──────────────────────────────────────────────────


def test_calendar_today_returns_every_calendar(client: TestClient) -> None:
    resp = client.get("/api/v1/calendar/today", params={"locale": "en"})
    assert resp.status_code == 200
    body = resp.json()
    cal_ids = {c["calendar_id"] for c in body["calendars"]}
    assert {"gregorian", "julian", "hebrew", "thelemic"} <= cal_ids


def test_calendar_today_supports_locale_param(client: TestClient) -> None:
    resp = client.get("/api/v1/calendar/today", params={"locale": "el"})
    assert resp.status_code == 200
    body = resp.json()
    gregorian = next(c for c in body["calendars"] if c["calendar_id"] == "gregorian")
    # The long form should be in Greek characters when locale=el.
    assert any(ch in gregorian["long"] for ch in "Ιανουαρίου ΦεβρουαρίουΜαρτίου ΑπριλίουΜαΐου Ιουνίου ΙουλίουΑυγούστου Σεπτεμβρίου ΟκτωβρίουΝοεμβρίουΔεκεμβρίου")


# ───── /astro/chart ─────────────────────────────────────────────────────


def test_astro_chart_returns_placements_houses_aspects(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/chart",
        params={
            "when": "2026-06-21T12:00:00Z",
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["zodiac"] == "tropical"
    assert body["house_system"] == "placidus"
    assert len(body["placements"]) >= 12  # planets + node + apogee at minimum
    assert len(body["houses"]["cusps"]) == 12  # 12-element cusps (cusps[0] dropped)
    assert body["aspects"]  # at least some aspects detected
    assert "Swiss Ephemeris" in body["attribution"]
    assert "JPL DE441" in body["attribution"]


def test_astro_chart_validates_latitude_range(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/chart",
        params={"when": "2026-06-21T12:00:00Z", "latitude": 100.0, "longitude": 0.0},
    )
    assert resp.status_code == 422


def test_astro_chart_with_sidereal_zodiac(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/chart",
        params={
            "when": "2026-06-21T12:00:00Z",
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
            "zodiac": "sidereal",
            "ayanamsa": "lahiri",
        },
    )
    assert resp.status_code == 200


def test_astro_chart_with_whole_sign_houses(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/chart",
        params={
            "when": "2026-06-21T12:00:00Z",
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
            "house_system": "whole-sign",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["house_system"] == "whole-sign"


# ───── /astro/now ───────────────────────────────────────────────────────


def test_astro_now_returns_current_chart(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/now",
        params={"latitude": ATHENS_LAT, "longitude": ATHENS_LON},
    )
    assert resp.status_code == 200
    body = resp.json()
    # `instant` should be recent (within a minute of now).
    chart_instant = datetime.fromisoformat(body["instant"].replace("Z", "+00:00"))
    drift = abs((chart_instant - datetime.now(tz=UTC)).total_seconds())
    assert drift < 60


# ───── /astro/planetary-hours ───────────────────────────────────────────


def test_planetary_hours_returns_24(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/astro/planetary-hours",
        params={
            "when": "2026-06-21T12:00:00Z",
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["hours"]) == 24
    assert body["current_hour_index"] in range(1, 25)


# ───── /astro/election/search ───────────────────────────────────────────


def test_election_search_with_preset(client: TestClient) -> None:
    start = datetime(2026, 6, 19, 0, tzinfo=UTC)
    end = datetime(2026, 6, 19, 23, tzinfo=UTC)
    resp = client.post(
        "/api/v1/astro/election/search",
        json={
            "preset": "venus_talisman",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
            "step_minutes": 60,
            "top_n": 5,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "elections" in body
    assert len(body["elections"]) <= 5
    assert "Swiss Ephemeris" in body["attribution"]


def test_election_search_with_custom_constraints(client: TestClient) -> None:
    start = datetime(2026, 6, 19, 0, tzinfo=UTC)
    end = datetime(2026, 6, 19, 23, tzinfo=UTC)
    resp = client.post(
        "/api/v1/astro/election/search",
        json={
            "constraints": [
                {"kind": "planetary_hour", "planet": "venus"},
            ],
            "start": start.isoformat(),
            "end": end.isoformat(),
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
            "step_minutes": 60,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["elections"]
    # Top result's breakdown carries the constraint description.
    top = body["elections"][0]
    descs = [item["constraint"] for item in top["breakdown"]]
    assert "Venus hour" in descs


def test_election_search_rejects_both_preset_and_constraints(client: TestClient) -> None:
    start = datetime(2026, 6, 19, 0, tzinfo=UTC)
    end = datetime(2026, 6, 19, 23, tzinfo=UTC)
    resp = client.post(
        "/api/v1/astro/election/search",
        json={
            "preset": "venus_talisman",
            "constraints": [{"kind": "planetary_hour", "planet": "mars"}],
            "start": start.isoformat(),
            "end": end.isoformat(),
            "latitude": ATHENS_LAT,
            "longitude": ATHENS_LON,
        },
    )
    assert resp.status_code == 422


# ───── /events ──────────────────────────────────────────────────────────


def test_events_returns_astronomical_and_festivals(client: TestClient) -> None:
    start = datetime(2026, 6, 1, tzinfo=UTC)
    end = datetime(2026, 7, 1, tzinfo=UTC)
    resp = client.get(
        "/api/v1/events",
        params={
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    # June has at least one Sun ingress + one full moon.
    astro_kinds = {e["kind"] for e in body["astronomical"]}
    assert "full-moon" in astro_kinds
    assert "ingress" in astro_kinds
    # Festivals in June: Litha + Vestalia + Deipnon × 1 + Noumenia × 1 + ...
    assert len(body["festivals"]) >= 3
    # Festivals carry source counts so the UI can flag well-cited entries.
    assert all(f["source_count"] >= 1 for f in body["festivals"])
    # v1-051: the Calendar detail rail needs the observance + the full
    # attestation chain, not just a count.
    for f in body["festivals"]:
        assert "practice" in f
        assert len(f["sources"]) == f["source_count"]
        for s in f["sources"]:
            assert s["kind"] in {"primary", "scholarly", "community"}
            assert s["title"]
            assert s["author"]


def test_events_rejects_inverted_range(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/events",
        params={
            "start": "2026-07-01T00:00:00Z",
            "end": "2026-06-01T00:00:00Z",
        },
    )
    assert resp.status_code == 422


def test_events_skips_festivals_when_disabled(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/events",
        params={
            "start": "2026-06-01T00:00:00Z",
            "end": "2026-07-01T00:00:00Z",
            "include_festivals": False,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["festivals"] == []
