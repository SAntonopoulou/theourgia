"""The elector, held to the phone's fixed sky.

The positions are the phone test suite's fixed chart (3 Aug 2026-flavoured,
ascendant 190.35 Libra): every expectation below was worked by hand from
those longitudes, so a port drift in configuration, houses, dignities, or
the void estimators fails by name here rather than in an election Sophia
is actually running.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta

import pytest

from theourgia.api.routers.v1.user_settings import AstroDoctrineModel
from theourgia.core.astro.elector import (
    BodyAt,
    ElectError,
    Judgement,
    Moment,
    _perfects_within_hours,
    _perfects_within_moon_travel,
    configuration_between,
    judge,
    merge,
    parse_ruleset,
    says,
    sort_windows,
)
from theourgia.core.astro.hellenistic.sect import Sect

DOCTRINE = AstroDoctrineModel()

#: The phone's fixed sky: (longitude, speed in deg/day).
FIXED = {
    "saturn": BodyAt(14.700, -0.05),  # Aries, retrograde
    "jupiter": BodyAt(127.483, 0.20),  # Leo
    "mars": BodyAt(84.683, 0.65),  # Gemini
    "sun": BodyAt(131.083, 0.96),  # Leo
    "venus": BodyAt(176.533, 1.10),  # Virgo
    "mercury": BodyAt(111.733, 1.50),  # Cancer
    "moon": BodyAt(7.233, 13.00),  # Aries, applying to Saturn
}
ASC = 190.35  # Libra rising

AT = datetime(2026, 8, 3, 9, 52, tzinfo=UTC)


def sky(**overrides: BodyAt) -> Moment:
    return Moment(
        at=AT,
        positions={**FIXED, **overrides},
        ascendant=ASC,
        sect=Sect.DIURNAL,
        hour_ruler="venus",
        day_ruler="sun",
        moon_void=False,
    )


def held(condition: str, moment: Moment | None = None, doctrine=DOCTRINE, **kw) -> bool:
    rules = parse_ruleset(
        {"id": "t", "name": "t", "summary": "",
         "clauses": [{"condition": condition, "because": "test", **kw}]})
    return judge(rules, moment or sky(), doctrine).findings[0].held


# ── the moon's conditions ────────────────────────────────────────────────


def test_moon_conditions() -> None:
    assert held("moon-not-void")  # the moment says so
    assert held("moon-in-sign", sign="aries")
    assert not held("moon-in-sign", sign="taurus")
    # Moon 236° past the Sun: waning.
    assert not held("moon-waxing")
    assert held("moon-waning")
    # Conjunct Saturn at 7.47° — joined to a malefic within the 8° orb...
    assert not held("moon-not-with-malefic")
    # ...but clear under a pack that states a tighter orb.
    assert held("moon-not-with-malefic", orb=5.0)
    # Applying to Saturn by conjunction.
    assert held("moon-applying-to", body="saturn")


# ── hours, days, sect, rising ────────────────────────────────────────────


def test_hour_day_sect_ascendant() -> None:
    assert held("hour-of", body="venus")
    assert not held("hour-of", body="mars")
    assert held("day-of", body="sun")
    assert held("hour-of-benefic")
    assert held("sect", value="diurnal")
    assert not held("sect", value="nocturnal")
    assert held("ascendant-sign", sign="libra")
    # Libra's lord is Venus, in the twelfth — not angular.
    assert not held("ascendant-ruler-angular")
    # Venus rules this hour: its own hour is friendly to it.
    assert held("hour-friendly-to", body="venus")
    # Venus (Virgo) is in aversion to the Sun (Leo) — no friendship.
    assert not held("hour-friendly-to", body="sun")


# ── bodies: dignity, motion, the Sun's fire ──────────────────────────────


def test_body_conditions() -> None:
    assert held("body-in-sign", body="sun", sign="leo")
    # Sun in Leo: domicile.
    assert held("body-dignified", body="sun")
    # Venus in Virgo: in fall, but the Dorothean earth triplicity by day
    # is hers — dignified AND debilitated at once, as the sources allow.
    assert held("body-dignified", body="venus")
    assert not held("body-not-debilitated", body="venus")
    assert held("body-not-debilitated", body="sun")
    assert not held("body-direct", body="saturn")
    assert held("body-direct", body="venus")
    # Jupiter 3.6° from the Sun: combust under every scheme, not cazimi.
    assert not held("body-not-combust", body="jupiter")
    assert not held("body-cazimi", body="jupiter")
    assert held("body-not-combust", body="venus")
    # Mercury 19.35° out: beyond even Lilly's 17° beams.
    assert held("body-not-under-beams", body="mercury")
    # Whole-sign houses from Libra rising: Moon in the seventh, Mercury
    # in the tenth, Venus in the twelfth.
    assert held("body-angular", body="moon")
    assert held("body-angular", body="mercury")
    assert not held("body-angular", body="venus")
    assert held("body-in-house", body="venus", house=12)


def test_regard_affliction_reception() -> None:
    # Jupiter trines the Moon at 0.25° — regarded by a benefic.
    assert held("body-aspected-by-benefic", body="moon")
    # Saturn's conjunction is a hard aspect within orb: afflicted...
    assert not held("body-not-afflicted", body="moon")
    # ...but the sect's contrary malefic by day is Mars, whose sextile
    # is not an affliction.
    assert held("body-not-afflicted-by-sect-malefic", body="moon")
    # The Moon applies to the Sun's trine at 3.85°, and the Sun is her
    # exaltation and triplicity lord in Aries: received.
    assert held("body-received", body="moon")


def test_lords_and_places() -> None:
    # First place is Libra: its lord Venus stands in the twelfth.
    assert not held("lord-of-house-angular", house=1)
    assert held("lord-of-house-direct", house=1)
    assert held("lord-of-house-not-combust", house=1)
    # Eleventh place is Leo: Jupiter sits there.
    assert held("benefic-in-house", house=11)
    # Saturn holds the seventh.
    assert not held("no-malefic-in-house", house=7)
    assert held("no-malefic-in-house", house=2)


def test_configurations() -> None:
    # Virgo–Gemini is a whole-sign square; 91.85° separation.
    assert held("configured-to", body="venus", other="mars", configuration="square")
    assert not held("configured-to", body="venus", other="mars", configuration="trine")
    # Leo–Aries is a trine, so denying it fails.
    assert not held("not-configured-to", body="sun", other="moon", configuration="trine")
    made = configuration_between(FIXED["moon"].longitude, FIXED["saturn"].longitude,
                                 FIXED["moon"].speed, FIXED["saturn"].speed)
    assert made is not None
    assert made.configuration == "conjunction"
    assert made.is_applying
    assert made.orb == pytest.approx(7.467, abs=0.01)
    # Virgo–Leo: aversion is null, a finding not a gap.
    assert configuration_between(FIXED["venus"].longitude, FIXED["sun"].longitude) is None


# ── the doctrine is honoured ─────────────────────────────────────────────


def test_solar_scheme_moves_the_combust_verdict() -> None:
    # A body 10° from the Sun: clear of combustion under Paulus (9°) and
    # Lilly (8.5°), combust under the unattributed medieval 12°.
    moment = sky(mercury=BodyAt(141.083, 1.5))
    assert held("body-not-combust", moment, body="mercury")
    lilly = AstroDoctrineModel(solar_phase="lilly1647")
    assert held("body-not-combust", moment, doctrine=lilly, body="mercury")
    medieval = AstroDoctrineModel(solar_phase="medievalUnattributed")
    assert not held("body-not-combust", moment, doctrine=medieval, body="mercury")


def test_exaltation_degree_doctrine() -> None:
    # Venus at 26.2 Pisces stands on the 27th ordinal degree. Degree mode
    # with the majority 27° crowns it; Porphyry's 26 does not.
    from theourgia.core.astro.elector import _dignity

    degree = AstroDoctrineModel(exaltation_degrees="degree", venus_exaltation_degree=27)
    porphyry = AstroDoctrineModel(exaltation_degrees="degree", venus_exaltation_degree=26)
    crowned, _, _ = _dignity("venus", 356.2, Sect.DIURNAL, degree)
    plain, _, _ = _dignity("venus", 356.2, Sect.DIURNAL, porphyry)
    assert "exaltation degree" in crowned
    assert "exaltation degree" not in plain
    assert "exaltation" in plain  # the sign is unanimous either way


# ── the void estimators ──────────────────────────────────────────────────


def test_sign_exit_estimator() -> None:
    # Jupiter's trine perfects in ~0.47 h; the Sun's in ~7.7 h.
    assert _perfects_within_hours(FIXED["moon"], FIXED, 5.0)
    assert not _perfects_within_hours(FIXED["moon"], FIXED, 0.2)


def test_thirty_degree_estimator_walks_the_ingress() -> None:
    # Moon 25° Aries, Mercury 20° Gemini: the conjunction perfects after
    # ~62° of travel — beyond the Hellenistic bound, so void — and the
    # solver must walk two ingresses to know that, where a whole-sign
    # estimator goes blind at the first.
    moon = BodyAt(25.0, 13.0)
    positions = {"moon": moon, "mercury": BodyAt(80.0, 1.5)}
    assert not _perfects_within_moon_travel(moon, positions, 30.0)
    assert _perfects_within_moon_travel(moon, positions, 70.0)


def test_thirty_degree_estimator_on_the_fixed_sky() -> None:
    # Jupiter's trine perfects after only ~0.25° of the Moon's travel
    # (0.25° applying orb against a slow Jupiter); nothing at all fits
    # inside a tenth of a degree.
    assert _perfects_within_moon_travel(FIXED["moon"], FIXED, 30.0)
    assert _perfects_within_moon_travel(FIXED["moon"], FIXED, 0.5)
    assert not _perfects_within_moon_travel(FIXED["moon"], FIXED, 0.1)


# ── ruleset parsing: tokens filled, unknowns refused ─────────────────────


def test_subject_token_filled() -> None:
    rules = parse_ruleset(
        {"id": "t", "name": "t", "summary": "",
         "clauses": [{"condition": "body-dignified", "body": "$subject", "because": "t"}]},
        subject_body="sun")
    assert rules.clauses[0].body == "sun"
    with pytest.raises(ElectError, match=r"\$subject"):
        parse_ruleset(
            {"id": "t", "name": "t", "summary": "",
             "clauses": [{"condition": "body-dignified", "body": "$subject", "because": "t"}]})


def test_house_token_filled() -> None:
    rules = parse_ruleset(
        {"id": "t", "name": "t", "summary": "",
         "clauses": [{"condition": "benefic-in-house", "house": "$house", "because": "t"}]},
        subject_house=10)
    assert rules.clauses[0].house == 10


def test_unknown_condition_dropped_and_named() -> None:
    # The phone drops what it cannot answer and judges by the rest — same
    # verdicts here, but the dropped condition is named for the caller.
    rules = parse_ruleset(
        {"id": "t", "name": "t", "summary": "",
         "clauses": [
             {"condition": "moon-in-decan", "because": "t"},
             {"condition": "moon-not-void", "because": "t"},
         ]})
    assert len(rules.clauses) == 1
    assert rules.dropped == ("moon-in-decan",)


def test_ruleset_of_only_unknowns_refused_by_name() -> None:
    # A ruleset that lost every clause would judge every moment perfect,
    # which is worse than one that does not appear.
    with pytest.raises(ElectError, match="moon-in-decan"):
        parse_ruleset(
            {"id": "t", "name": "t", "summary": "",
             "clauses": [{"condition": "moon-in-decan", "because": "t"}]})


def test_clause_without_because_is_dropped() -> None:
    with pytest.raises(ElectError, match="no readable clauses"):
        parse_ruleset(
            {"id": "t", "name": "t", "summary": "",
             "clauses": [{"condition": "moon-not-void"}]})


# ── compounds, vetoes, scoring ───────────────────────────────────────────


def test_compound_any_and_all() -> None:
    ruleset = {"id": "t", "name": "t", "summary": "", "clauses": [
        {"any": [
            {"condition": "moon-waxing", "because": "t"},
            {"condition": "body-dignified", "body": "sun", "because": "t"},
        ], "because": "either will carry it", "weight": 3},
        {"all": [
            {"condition": "moon-waxing", "because": "t"},
            {"condition": "body-dignified", "body": "sun", "because": "t"},
        ], "because": "both must hold"},
    ]}
    rules = parse_ruleset(ruleset)
    j = judge(rules, sky(), DOCTRINE)
    any_f, all_f = j.findings
    assert any_f.held and not all_f.held
    assert j.score == 3
    assert j.out_of == 4
    # The compound speaks through its decisive parts.
    assert says(any_f) == "The Sun is dignified"
    assert says(all_f) == "The Moon is waning"


def test_veto_rules_out_without_scoring() -> None:
    ruleset = {"id": "t", "name": "t", "summary": "", "clauses": [
        {"condition": "moon-waxing", "because": "t", "veto": True},
        {"condition": "body-dignified", "body": "sun", "because": "t"},
    ]}
    j = judge(parse_ruleset(ruleset), sky(), DOCTRINE)
    assert j.is_vetoed
    assert j.out_of == 1  # the veto never inflates the denominator
    assert j.score == 1


# ── windows: folded alike, sorted with the bar ───────────────────────────


def _judgement(at: datetime, pattern: list[bool], vetoed: bool = False) -> Judgement:
    rules = parse_ruleset(
        {"id": "t", "name": "t", "summary": "", "clauses": [
            {"condition": "moon-not-void", "because": "t", "veto": vetoed},
            {"condition": "moon-waxing", "because": "t"},
        ]})
    j = judge(rules, sky(), DOCTRINE)
    findings = tuple(replace(f, held=h) for f, h in zip(j.findings, pattern, strict=True))
    score = sum(f.clause.weight for f in findings if f.held and not f.clause.is_veto)
    return Judgement(at=at, findings=findings, score=score, out_of=j.out_of)


def test_merge_folds_alike_samples() -> None:
    t0 = AT
    step = timedelta(minutes=30)
    samples = [
        _judgement(t0, [True, True]),
        _judgement(t0 + step, [True, True]),
        _judgement(t0 + 2 * step, [True, False]),
        _judgement(t0 + 3 * step, [True, True]),
    ]
    windows = merge(samples, step)
    assert len(windows) == 3
    assert windows[0].from_ == t0
    assert windows[0].until == t0 + 2 * step
    assert windows[-1].until == t0 + 4 * step  # last window extended one step


def test_sort_offers_only_what_clears_the_bar() -> None:
    step = timedelta(minutes=30)
    strong = merge([_judgement(AT, [True, True])], step)[0]
    weak = merge([_judgement(AT + step, [True, False])], step)[0]
    out = merge([_judgement(AT + 2 * step, [False, True], vetoed=True)], step)[0]
    favourable, weaker, ruled_out = sort_windows([weak, out, strong])
    assert favourable == [strong]
    assert weaker == [weak]
    assert ruled_out == [out]


def test_sort_offers_best_of_a_poor_week() -> None:
    # Nothing clears 60% — the strongest are offered anyway, because
    # "the best of a poor week" is a real answer and silence is not.
    step = timedelta(minutes=30)
    weak_a = merge([_judgement(AT, [True, False])], step)[0]
    weak_b = merge([_judgement(AT + step, [False, False])], step)[0]
    favourable, weaker, ruled_out = sort_windows([weak_a, weak_b])
    assert favourable == [weak_a, weak_b]
    assert weaker == []
    assert ruled_out == []


# ── the endpoint ─────────────────────────────────────────────────────────


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from theourgia.api.app import create_app

    return TestClient(create_app())


RULESET = {
    "id": "venus-working", "name": "A working of Venus", "summary": "",
    "clauses": [
        {"condition": "moon-not-void", "because": "the Moon carries the matter", "veto": True},
        {"condition": "hour-of", "body": "venus", "because": "her hour", "weight": 2},
        {"condition": "body-dignified", "body": "venus", "because": "the lady of the work"},
    ],
}


def test_elect_endpoint_judges_a_span(client) -> None:
    resp = client.post("/api/v1/astro/elect", json={
        "ruleset": RULESET,
        "start": "2026-08-24T06:00:00Z",
        "end": "2026-08-24T18:00:00Z",
        "step_minutes": 60,
        "latitude": 51.5,
        "longitude": -0.1,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "A working of Venus"
    assert body["best_possible"] == 3
    assert body["samples"] == 12
    offered = body["favourable"] + body["weaker"] + body["ruled_out"]
    assert offered, "a judged span yields windows"
    window = offered[0]
    assert {"start", "end", "score", "out_of", "vetoed", "findings"} <= window.keys()
    finding = window["findings"][0]
    assert finding["because"] == "the Moon carries the matter"
    assert finding["says"].startswith("The Moon is")


def test_elect_endpoint_refuses_unknown_condition_by_name(client) -> None:
    bad = {"id": "x", "name": "x", "summary": "", "clauses": [
        {"condition": "moon-in-decan", "because": "t"},
    ]}
    resp = client.post("/api/v1/astro/elect", json={
        "ruleset": bad,
        "start": "2026-08-24T06:00:00Z",
        "end": "2026-08-24T08:00:00Z",
        "step_minutes": 60,
        "latitude": 51.5,
        "longitude": -0.1,
    })
    assert resp.status_code == 422
    assert "moon-in-decan" in resp.json()["detail"]


def test_elect_endpoint_caps_the_sample_count(client) -> None:
    resp = client.post("/api/v1/astro/elect", json={
        "ruleset": RULESET,
        "start": "2026-08-01T00:00:00Z",
        "end": "2026-09-01T00:00:00Z",
        "step_minutes": 5,
        "latitude": 51.5,
        "longitude": -0.1,
    })
    assert resp.status_code == 422
    assert "at most" in resp.json()["detail"]
