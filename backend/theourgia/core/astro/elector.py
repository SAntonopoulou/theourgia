"""The election engine — the phone's elector, ported whole.

A ruleset from an election-rules pack asks about the sky in a closed
vocabulary of twenty-nine conditions; the elector walks a span of time,
judges every sample against every clause, folds contiguous samples that
judged alike into windows, and returns the windows with their reasons —
which is what makes an election arguable rather than oracular. A pack
asking for a condition this build lacks is refused by name.

Faithful to ``lib/domain/astrology/elector.dart`` and ``election.dart``
on the phone, clause for clause, including:

* vetoes as vetoes (a void Moon is not a deduction to be outweighed);
* compound ``all``/``any`` clauses as ONE finding with the decisive parts;
* the practitioner's doctrine honoured — solar-phase orbs by the chosen
  scheme with a pack's stated clause orb winning, void of course under
  the chosen rule (the Hellenistic thirty-degree bound solved sign-aware,
  since the whole-sign estimator goes blind at the ingress);
* windows that must EARN being offered (Elections.sort — favourable at
  60% of the ruleset's own best, weaker kept visible, ruled-out returned
  with their reasons).

Wire format: the pack JSON exactly as the phone parses it — condition
keys like ``moon-not-void``, body/sign/configuration keys as the Dart
enum names (``sun``, ``aries``, ``trine``), ``$subject``/``$significator``
and ``$house`` placeholders filled at call time.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from theourgia.core.astro import ChartRequest, compute_chart
from theourgia.core.astro.hellenistic import dignities as hdig
from theourgia.core.astro.hellenistic.bodies import Planet
from theourgia.core.astro.hellenistic.sect import Sect, determine
from theourgia.core.astro.hellenistic.zodiac import degree_in_sign, sign_of_longitude
from theourgia.core.astro.houses import HouseSystem
from theourgia.core.astro.planetary_hours import compute_planetary_hours
from theourgia.core.astro.void_of_course import moon_next_sign_ingress

__all__ = [
    "AVAILABLE_CONDITIONS",
    "Clause",
    "ElectError",
    "Finding",
    "Judgement",
    "Rules",
    "Window",
    "elect",
    "judge",
    "parse_ruleset",
    "sort_windows",
]

# ── the closed vocabulary ────────────────────────────────────────────────

AVAILABLE_CONDITIONS: frozenset[str] = frozenset({
    "moon-not-void", "moon-in-sign", "moon-waxing", "moon-waning",
    "moon-not-with-malefic", "moon-applying-to",
    "hour-of", "day-of", "hour-of-benefic", "hour-friendly-to",
    "sect",
    "ascendant-sign", "ascendant-ruler-angular",
    "body-in-sign", "body-dignified", "body-direct", "body-not-combust",
    "body-not-under-beams", "body-cazimi", "body-not-debilitated",
    "body-angular", "body-in-house",
    "body-aspected-by-benefic", "body-not-afflicted",
    "body-not-afflicted-by-sect-malefic", "body-received",
    "lord-of-house-angular", "lord-of-house-dignified",
    "lord-of-house-direct", "lord-of-house-not-combust",
    "benefic-in-house", "no-malefic-in-house",
    "configured-to", "not-configured-to",
})

CLASSICAL: tuple[str, ...] = (
    "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
)
BENEFICS = ("jupiter", "venus")
MALEFICS = ("mars", "saturn")

SIGN_NAMES: tuple[str, ...] = (
    "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra",
    "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
)
SIGN_LABELS: tuple[str, ...] = (
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra",
    "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
)
BODY_LABELS: dict[str, str] = {
    "sun": "the Sun", "moon": "the Moon", "mercury": "Mercury",
    "venus": "Venus", "mars": "Mars", "jupiter": "Jupiter",
    "saturn": "Saturn",
}

#: Whole-sign configurations by sign distance. Anything else is aversion —
#: a finding, not a gap.
_CONFIG_BY_DISTANCE: dict[int, tuple[str, float]] = {
    0: ("conjunction", 0.0),
    2: ("sextile", 60.0),
    3: ("square", 90.0),
    4: ("trine", 120.0),
    6: ("opposition", 180.0),
}

_DOMICILE: dict[int, str] = {
    0: "mars", 1: "venus", 2: "mercury", 3: "moon", 4: "sun", 5: "mercury",
    6: "venus", 7: "mars", 8: "jupiter", 9: "saturn", 10: "saturn",
    11: "jupiter",
}

_PLACES = (
    "", "first place", "second place", "third place", "fourth place",
    "fifth place", "sixth place", "seventh place", "eighth place",
    "ninth place", "tenth place", "eleventh place", "twelfth place",
)


class ElectError(ValueError):
    """A ruleset this build must refuse, with the reason named."""


# ── the ruleset, parsed from the pack's own JSON ─────────────────────────


@dataclass(frozen=True)
class Clause:
    condition: str
    because: str
    body: str | None = None
    other: str | None = None
    sign: int | None = None  # 0-based sign index
    configuration: str | None = None
    house: int | None = None
    value: str | None = None
    weight: int = 1
    is_veto: bool = False
    orb: float | None = None
    all_: tuple[Clause, ...] = ()
    any_: tuple[Clause, ...] = ()

    @property
    def is_compound(self) -> bool:
        return bool(self.all_ or self.any_)


@dataclass(frozen=True)
class Rules:
    id: str
    name: str
    summary: str
    clauses: tuple[Clause, ...]

    @property
    def best_possible(self) -> int:
        return sum(c.weight for c in self.clauses if not c.is_veto)


def _is_token(body: object) -> bool:
    return body in ("$subject", "$significator")


def _parse_clause(
    json: dict, subject_body: str | None, subject_house: int | None,
) -> Clause | None:
    # Compound first — the phone's shape exactly.
    for key in ("all", "any"):
        parts = json.get(key)
        if not isinstance(parts, list):
            continue
        because = json.get("because")
        if not isinstance(because, str) or not because:
            return None
        read = tuple(
            c
            for part in parts
            if isinstance(part, dict)
            and (c := _parse_clause(part, subject_body, subject_house))
        )
        if not read:
            return None
        return Clause(
            condition="moon-not-void",  # immaterial for a compound, never tested
            because=because,
            all_=read if key == "all" else (),
            any_=read if key == "any" else (),
            weight=int(json.get("weight") or 1),
            is_veto=bool(json.get("veto")),
        )

    condition = json.get("condition")
    because = json.get("because")
    if not isinstance(because, str) or not because:
        return None
    if not isinstance(condition, str):
        return None
    if condition not in AVAILABLE_CONDITIONS:
        raise ElectError(
            f"This ruleset asks for {condition!r}, which this build cannot "
            "answer — refused by name rather than half-performed."
        )

    raw_body = json.get("body")
    body = subject_body if _is_token(raw_body) else raw_body
    if _is_token(raw_body) and subject_body is None:
        raise ElectError(
            "This ruleset names $subject — choose the planet it is taken "
            "for before running it."
        )
    raw_house = json.get("house")
    if raw_house == "$house":
        if subject_house is None:
            raise ElectError(
                "This ruleset names $house — choose the matter's place "
                "before running it."
            )
        house: int | None = subject_house
    else:
        house = int(raw_house) if isinstance(raw_house, (int, float)) else None

    sign_name = json.get("sign")
    sign = SIGN_NAMES.index(sign_name) if sign_name in SIGN_NAMES else None

    return Clause(
        condition=condition,
        because=because,
        body=body if isinstance(body, str) else None,
        other=json.get("other") if isinstance(json.get("other"), str) else None,
        sign=sign,
        configuration=(
            json.get("configuration")
            if json.get("configuration")
            in ("conjunction", "sextile", "square", "trine", "opposition")
            else None
        ),
        house=house,
        value=json.get("value") if isinstance(json.get("value"), str) else None,
        weight=int(json.get("weight") or 1),
        is_veto=bool(json.get("veto")),
        orb=float(json["orb"]) if isinstance(json.get("orb"), (int, float)) else None,
    )


def parse_ruleset(
    json: dict,
    *,
    subject_body: str | None = None,
    subject_house: int | None = None,
) -> Rules:
    """A pack ruleset, `$subject`/`$house` filled, unknown conditions refused."""
    clauses = tuple(
        c
        for raw in (json.get("clauses") or [])
        if isinstance(raw, dict)
        and (c := _parse_clause(raw, subject_body, subject_house))
    )
    if not clauses:
        raise ElectError("This ruleset carries no readable clauses.")
    return Rules(
        id=str(json.get("id") or ""),
        name=str(json.get("name") or ""),
        summary=str(json.get("summary") or ""),
        clauses=clauses,
    )


# ── one moment of sky, in the form the clauses ask about it ──────────────


@dataclass(frozen=True)
class BodyAt:
    longitude: float
    speed: float

    @property
    def sign(self) -> int:
        return int(self.longitude % 360 // 30)


@dataclass(frozen=True)
class Moment:
    at: datetime
    positions: dict[str, BodyAt]
    ascendant: float
    sect: Sect
    hour_ruler: str | None
    day_ruler: str | None
    moon_void: bool

    def of(self, body: str | None) -> BodyAt | None:
        return self.positions.get(body) if body else None

    def house_of(self, longitude: float) -> int:
        return (int(longitude % 360 // 30) - int(self.ascendant % 360 // 30)) % 12 + 1


def _fold(x: float) -> float:
    return ((x + 180.0) % 360.0) - 180.0


def _apart(a: float, b: float) -> float:
    raw = abs(a - b) % 360.0
    return 360.0 - raw if raw > 180.0 else raw


@dataclass(frozen=True)
class Configured:
    configuration: str
    exact_angle: float
    separation: float
    orb: float
    is_applying: bool


def configuration_between(
    a: float, b: float, speed_a: float = 0.0, speed_b: float = 0.0,
) -> Configured | None:
    """Whole-sign configuration, with the degree detail that refines it.

    Null when the signs stand in aversion — a finding rather than a gap.
    A straight port of the phone's ``configurationBetween``.
    """
    distance = min(
        (int(a % 360 // 30) - int(b % 360 // 30)) % 12,
        (int(b % 360 // 30) - int(a % 360 // 30)) % 12,
    )
    made = _CONFIG_BY_DISTANCE.get(distance)
    if made is None:
        return None
    name, exact = made
    separation = _apart(a, b)
    orb = abs(separation - exact)
    delta = _fold(a - b)
    relative = speed_a - speed_b
    rate = relative if delta >= 0 else -relative
    beyond = separation > exact
    return Configured(
        configuration=name,
        exact_angle=exact,
        separation=separation,
        orb=orb,
        is_applying=(rate < 0) if beyond else (rate > 0),
    )


# ── void of course, the phone's per-sample estimators ────────────────────


def _perfects_within_hours(
    moon: BodyAt, positions: dict[str, BodyAt], hours_left: float,
) -> bool:
    """Sign-exit rule's bound: any applying configuration completes in time."""
    if hours_left <= 0:
        return False
    for name, other in positions.items():
        if name == "moon":
            continue
        made = configuration_between(
            moon.longitude, other.longitude, moon.speed, other.speed,
        )
        if made is None or not made.is_applying:
            continue
        closing = abs(moon.speed - other.speed)
        if closing <= 0:
            continue
        if (made.orb / closing) * 24.0 <= hours_left:
            return True
    return False


def _perfects_within_moon_travel(
    moon: BodyAt, positions: dict[str, BodyAt], travel_degrees: float,
) -> bool:
    """The Hellenistic bound (*kenodromia*): sign-aware and linear, walking
    straight across the ingress where the whole-sign estimator goes blind."""
    if moon.speed <= 0:
        return False
    for name, other in positions.items():
        if name == "moon":
            continue
        ratio = other.speed / moon.speed
        closing = 1.0 - ratio
        if closing <= 0:
            continue
        s0 = (moon.longitude - other.longitude) % 360.0
        for target in (0.0, 60.0, 90.0, 120.0, 180.0, 240.0, 270.0, 300.0):
            delta = (target - s0) % 360.0
            if delta <= 0:
                delta += 360.0
            tau = delta / closing
            if tau > travel_degrees:
                continue
            moon_lon = (moon.longitude + tau) % 360.0
            other_lon = (other.longitude + ratio * tau) % 360.0
            distance = min(
                (int(moon_lon // 30) - int(other_lon // 30)) % 12,
                (int(other_lon // 30) - int(moon_lon // 30)) % 12,
            )
            made = _CONFIG_BY_DISTANCE.get(distance)
            angle = 360.0 - target if target > 180.0 else target
            if made is not None and made[1] == angle:
                return True
    return False


# ── dignities, under the doctrine ────────────────────────────────────────


def _planet_of(body: str) -> Planet | None:
    try:
        return next(p for p in Planet if p.id == body)
    except StopIteration:
        return None


def _dignity(body: str, lon: float, sect: Sect, doctrine) -> tuple[list[str], list[str], dict[str, str]]:
    """(held, debilities, lords) for one classical body — the same judgment
    the chart-doctrine endpoint renders, kept in step by construction."""
    planet = _planet_of(body)
    if planet is None or planet.is_node:
        return [], [], {}
    sign = sign_of_longitude(lon)
    deg_in = degree_in_sign(lon)
    domicile = hdig.domicile_lord_of(sign)
    exaltation = hdig.exaltation_ruler_of(sign)
    triplicity = hdig.triplicity_lord_of(sign, sect)
    bound = hdig.bound_lord_of(sign, deg_in)
    held: list[str] = []
    if domicile is planet:
        held.append("domicile")
    if exaltation is planet:
        held.append("exaltation")
        if doctrine.exaltation_degrees == "degree":
            e = hdig.exaltation_of(planet)
            chosen = (
                doctrine.saturn_exaltation_degree
                if planet is Planet.SATURN
                else doctrine.venus_exaltation_degree
                if planet is Planet.VENUS
                else (e.degree if e else None)
            )
            if chosen is not None and hdig.ordinal_degree(deg_in) == chosen:
                held.append("exaltation degree")
    if triplicity is planet:
        held.append("triplicity")
    if bound is planet:
        held.append("bound")
    if hdig.decan_ruler_of(sign, deg_in) is planet:
        held.append("decan")
    debilities: list[str] = []
    if hdig.adversity_lord_of(sign) is planet:
        debilities.append("detriment")
    if hdig.fall_ruler_of(sign) is planet:
        debilities.append("fall")
    lords = {
        "domicile": domicile.id,
        "exaltation": exaltation.id if exaltation else "",
        "triplicity": triplicity.id,
        "bound": bound.id,
    }
    return held, debilities, lords


# ── the judgement ────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Finding:
    clause: Clause
    held: bool
    detail: str = ""
    parts: tuple[Finding, ...] = ()

    @property
    def vetoed(self) -> bool:
        return self.clause.is_veto and not self.held


@dataclass(frozen=True)
class Judgement:
    at: datetime
    findings: tuple[Finding, ...]
    score: int
    out_of: int

    @property
    def is_vetoed(self) -> bool:
        return any(f.vetoed for f in self.findings)

    @property
    def fraction(self) -> float | None:
        return None if self.out_of == 0 else self.score / self.out_of


def _is_not_combust(body: BodyAt, moment: Moment, orb: float | None, doctrine) -> bool:
    sun = moment.of("sun")
    if sun is None:
        return False
    scheme = _scheme(doctrine)
    apart = _apart(body.longitude, sun.longitude)
    return apart > (orb if orb is not None else scheme["combust"]) or apart <= scheme["cazimi"]


def _scheme(doctrine) -> dict[str, float]:
    return {
        "paulus": {"beams": 15.0, "combust": 9.0, "cazimi": 1.0},
        "lilly1647": {"beams": 17.0, "combust": 8.5, "cazimi": 17 / 60},
        "medievalUnattributed": {"beams": 15.0, "combust": 12.0, "cazimi": 16 / 60},
    }.get(doctrine.solar_phase, {"beams": 15.0, "combust": 9.0, "cazimi": 1.0})


def _test(clause: Clause, moment: Moment, doctrine) -> Finding:  # noqa: PLR0912, PLR0915
    if clause.all_ or clause.any_:
        parts = tuple(_test(c, moment, doctrine) for c in (clause.all_ or clause.any_))
        held = all(f.held for f in parts) if clause.all_ else any(f.held for f in parts)
        return Finding(clause=clause, held=held, parts=parts)

    held = False
    detail = ""
    c = clause.condition

    if c == "moon-not-void":
        held = not moment.moon_void
    elif c == "moon-in-sign":
        moon = moment.of("moon")
        held = moon is not None and moon.sign == clause.sign
    elif c in ("moon-waxing", "moon-waning"):
        moon, sun = moment.of("moon"), moment.of("sun")
        waxing = (
            moon is not None
            and sun is not None
            and ((moon.longitude - sun.longitude) % 360.0) < 180.0
        )
        held = waxing if c == "moon-waxing" else (moon is not None and sun is not None and not waxing)
    elif c == "moon-not-with-malefic":
        moon = moment.of("moon")
        joined = False
        if moon is not None:
            for malefic in MALEFICS:
                other = moment.of(malefic)
                if other is None:
                    continue
                made = configuration_between(moon.longitude, other.longitude)
                if (
                    made is not None
                    and made.configuration == "conjunction"
                    and made.orb <= (clause.orb or 8.0)
                ):
                    joined = True
        held = moon is None or not joined
    elif c == "hour-of":
        held = moment.hour_ruler == clause.body
        if moment.hour_ruler is None:
            detail = "the hours cannot be divided here"
    elif c == "day-of":
        held = moment.day_ruler == clause.body
    elif c == "sect":
        held = ("diurnal" if moment.sect is Sect.DIURNAL else "nocturnal") == clause.value
    elif c == "ascendant-sign":
        held = int(moment.ascendant % 360 // 30) == clause.sign
    elif c == "ascendant-ruler-angular":
        lord = _DOMICILE[int(moment.ascendant % 360 // 30)]
        position = moment.of(lord)
        held = position is not None and moment.house_of(position.longitude) in (1, 4, 7, 10)
    elif c == "body-in-sign":
        position = moment.of(clause.body)
        held = position is not None and position.sign == clause.sign
    elif c == "body-dignified":
        position = moment.of(clause.body)
        if position is not None:
            held_list, _, _ = _dignity(clause.body or "", position.longitude, moment.sect, doctrine)
            held = bool(held_list)
    elif c == "body-direct":
        position = moment.of(clause.body)
        held = position is not None and position.speed >= 0
        if not held and clause.body:
            detail = f"{BODY_LABELS.get(clause.body, clause.body)} is retrograde"
    elif c == "body-not-combust":
        position, sun = moment.of(clause.body), moment.of("sun")
        if position is not None and sun is not None:
            apart = _apart(position.longitude, sun.longitude)
            held = _is_not_combust(position, moment, clause.orb, doctrine)
            if apart <= _scheme(doctrine)["cazimi"]:
                detail = "cazimi — in the heart of the Sun"
            elif not held:
                detail = f"{apart:.1f}° from the Sun, burnt up"
    elif c == "body-not-under-beams":
        position, sun = moment.of(clause.body), moment.of("sun")
        if position is not None and sun is not None:
            scheme = _scheme(doctrine)
            apart = _apart(position.longitude, sun.longitude)
            beams = clause.orb if clause.orb is not None else scheme["beams"]
            held = apart > beams or apart <= scheme["cazimi"]
            if not held:
                detail = f"{apart:.1f}° from the Sun, under the beams"
    elif c == "body-cazimi":
        position, sun = moment.of(clause.body), moment.of("sun")
        held = (
            position is not None
            and sun is not None
            and _apart(position.longitude, sun.longitude) <= _scheme(doctrine)["cazimi"]
        )
    elif c == "body-not-debilitated":
        position = moment.of(clause.body)
        if position is not None:
            _, debilities, _ = _dignity(clause.body or "", position.longitude, moment.sect, doctrine)
            held = not debilities
            detail = " and ".join(debilities)
    elif c in ("body-aspected-by-benefic", "body-not-afflicted", "body-not-afflicted-by-sect-malefic"):
        position = moment.of(clause.body)
        if c == "body-aspected-by-benefic":
            wanted: tuple[str, ...] = BENEFICS
        elif c == "body-not-afflicted-by-sect-malefic":
            wanted = ("mars",) if moment.sect is Sect.DIURNAL else ("saturn",)
        else:
            wanted = MALEFICS
        found: list[str] = []
        for other_name in wanted:
            if other_name == clause.body:
                continue
            other = moment.of(other_name)
            if position is None or other is None:
                continue
            made = configuration_between(
                position.longitude, other.longitude, position.speed, other.speed,
            )
            if made is None or made.orb > (clause.orb or 8.0):
                continue
            hard = made.configuration in ("square", "opposition", "conjunction")
            if c != "body-aspected-by-benefic" and not hard:
                continue
            found.append(f"{BODY_LABELS[other_name]} by {made.configuration}")
        held = bool(found) if c == "body-aspected-by-benefic" else not found
        if c == "body-not-afflicted-by-sect-malefic" and not found:
            feared = "mars" if moment.sect is Sect.DIURNAL else "saturn"
            detail = f"clear of {BODY_LABELS[feared]}"
        if found:
            detail = ", ".join(found)
    elif c == "body-received":
        position = moment.of(clause.body)
        if position is not None:
            _, _, lords = _dignity(clause.body or "", position.longitude, moment.sect, doctrine)
            for other_name, other in moment.positions.items():
                if other_name == clause.body:
                    continue
                made = configuration_between(
                    position.longitude, other.longitude, position.speed, other.speed,
                )
                if made is None or not made.is_applying or made.orb > (clause.orb or 8.0):
                    continue
                if other_name in (
                    lords["domicile"], lords["exaltation"], lords["bound"], lords["triplicity"],
                ):
                    held = True
                    detail = f"received by {BODY_LABELS[other_name]}"
                    break
    elif c == "hour-of-benefic":
        held = moment.hour_ruler in BENEFICS
        if moment.hour_ruler:
            detail = f"the hour of {BODY_LABELS.get(moment.hour_ruler, moment.hour_ruler)}"
    elif c == "hour-friendly-to":
        lord = moment.hour_ruler
        position = moment.of(clause.body)
        of_lord = moment.of(lord) if lord else None
        if lord is None or position is None or of_lord is None:
            held = False
        elif lord == clause.body:
            held = True
            detail = "its own hour"
        else:
            made = configuration_between(of_lord.longitude, position.longitude)
            held = made is not None and made.configuration in ("trine", "sextile")
            if held and made is not None:
                detail = f"the hour of {BODY_LABELS[lord]}, {made.configuration}"
    elif c == "body-angular":
        position = moment.of(clause.body)
        held = position is not None and moment.house_of(position.longitude) in (1, 4, 7, 10)
    elif c == "body-in-house":
        position = moment.of(clause.body)
        held = position is not None and moment.house_of(position.longitude) == clause.house
    elif c in (
        "lord-of-house-angular", "lord-of-house-dignified",
        "lord-of-house-direct", "lord-of-house-not-combust",
    ):
        house = clause.house or 0
        lord = None
        if 1 <= house <= 12:
            cusp_sign = (int(moment.ascendant % 360 // 30) + house - 1) % 12
            lord = _DOMICILE[cusp_sign]
        position = moment.of(lord)
        if position is not None and lord is not None:
            if c == "lord-of-house-angular":
                held = moment.house_of(position.longitude) in (1, 4, 7, 10)
            elif c == "lord-of-house-dignified":
                held_list, _, _ = _dignity(lord, position.longitude, moment.sect, doctrine)
                held = bool(held_list)
            elif c == "lord-of-house-direct":
                held = position.speed >= 0
            else:
                held = _is_not_combust(position, moment, clause.orb, doctrine)
            detail = f"its lord is {BODY_LABELS[lord]}"
    elif c in ("benefic-in-house", "no-malefic-in-house"):
        wanted = BENEFICS if c == "benefic-in-house" else MALEFICS
        present = [
            b
            for b in wanted
            if (p := moment.of(b)) is not None and moment.house_of(p.longitude) == clause.house
        ]
        held = bool(present) if c == "benefic-in-house" else not present
        if present:
            detail = " and ".join(BODY_LABELS[b] for b in present)
    elif c == "moon-applying-to":
        moon, other = moment.of("moon"), moment.of(clause.body)
        made = (
            configuration_between(moon.longitude, other.longitude, moon.speed, other.speed)
            if moon is not None and other is not None
            else None
        )
        held = made is not None and made.is_applying
        if made is not None:
            detail = f"{made.configuration}, {made.orb:.1f}° off"
    elif c in ("configured-to", "not-configured-to"):
        a, b = moment.of(clause.body), moment.of(clause.other)
        made = (
            configuration_between(a.longitude, b.longitude, a.speed, b.speed)
            if a is not None and b is not None
            else None
        )
        stands = made is not None and made.configuration == clause.configuration
        held = stands if c == "configured-to" else not stands
        if made is not None:
            detail = f"{made.orb:.1f}° from exact"

    return Finding(clause=clause, held=held, detail=detail)


def judge(rules: Rules, moment: Moment, doctrine) -> Judgement:
    findings = tuple(_test(clause, moment, doctrine) for clause in rules.clauses)
    return Judgement(
        at=moment.at,
        findings=findings,
        score=sum(f.clause.weight for f in findings if f.held and not f.clause.is_veto),
        out_of=rules.best_possible,
    )


# ── the fact each finding states (the phone's Finding.says) ──────────────


def says(finding: Finding) -> str:
    """The fact this finding states, capitalized as a sentence. Joined
    compounds keep later items' articles lowercase mid-sentence."""
    sentence = _says(finding)
    return sentence[:1].upper() + sentence[1:] if sentence else sentence


def _says(finding: Finding) -> str:
    clause, held = finding.clause, finding.held
    if clause.all_ or clause.any_:
        decisive = [f for f in finding.parts if f.held == held] or list(finding.parts)
        sayings = [_lower_article(_says(f)) if i else _says(f) for i, f in enumerate(decisive)]
        joined = _share_subject(sayings)
        return f"neither {_lower_article(joined)}" if clause.any_ and not held else joined

    body = BODY_LABELS.get(clause.body or "", "it")
    other = BODY_LABELS.get(clause.other or "", "it")
    sign = SIGN_LABELS[clause.sign] if clause.sign is not None else "that sign"
    place = _PLACES[clause.house] if clause.house and clause.house <= 12 else "that place"
    made = clause.configuration or "configured"
    c = clause.condition
    table: dict[str, tuple[str, str]] = {
        "moon-not-void": ("The Moon is not void", "The Moon is void of course"),
        "moon-in-sign": (f"The Moon is in {sign}", f"The Moon is not in {sign}"),
        "moon-waxing": ("The Moon is waxing", "The Moon is waning"),
        "moon-waning": ("The Moon is waning", "The Moon is waxing"),
        "moon-not-with-malefic": (
            "The Moon is clear of the malefics", "The Moon is joined to a malefic",
        ),
        "hour-of": (f"The hour of {body}", f"Not the hour of {body}"),
        "day-of": (f"The day of {body}", f"Not the day of {body}"),
        "sect": (f"A {clause.value or ''} chart", f"Not a {clause.value or ''} chart"),
        "ascendant-sign": (f"{sign} is rising", f"{sign} is not rising"),
        "ascendant-ruler-angular": (
            "The lord of the rising sign is angular",
            "The lord of the rising sign is not angular",
        ),
        "body-in-sign": (f"{body} is in {sign}", f"{body} is not in {sign}"),
        "body-dignified": (f"{body} is dignified", f"{body} has no dignity where it stands"),
        "body-direct": (f"{body} is direct", f"{body} is retrograde"),
        "body-not-combust": (f"{body} is clear of the Sun's fire", f"{body} is combust"),
        "body-not-under-beams": (
            f"{body} is out of the Sun's beams", f"{body} is under the beams",
        ),
        "body-cazimi": (f"{body} is in the heart of the Sun", f"{body} is not cazimi"),
        "body-not-debilitated": (
            f"{body} is neither in detriment nor fall", f"{body} is debilitated",
        ),
        "body-angular": (f"{body} is angular", f"{body} is not angular"),
        "body-in-house": (f"{body} is in the {place}", f"{body} is not in the {place}"),
        "lord-of-house-angular": (
            f"The lord of the {place} is angular", f"The lord of the {place} is not angular",
        ),
        "lord-of-house-dignified": (
            f"The lord of the {place} is dignified",
            f"The lord of the {place} has no dignity where it stands",
        ),
        "lord-of-house-direct": (
            f"The lord of the {place} is direct", f"The lord of the {place} is retrograde",
        ),
        "lord-of-house-not-combust": (
            f"The lord of the {place} is clear of the Sun's fire",
            f"The lord of the {place} is combust",
        ),
        "benefic-in-house": (
            f"A benefic is in the {place}", f"No benefic is in the {place}",
        ),
        "no-malefic-in-house": (
            f"No malefic is in the {place}", f"A malefic is in the {place}",
        ),
        "moon-applying-to": (
            f"The Moon is applying to {body}", f"The Moon is not applying to {body}",
        ),
        "body-aspected-by-benefic": (
            f"{body} is regarded by a benefic", f"No benefic regards {body}",
        ),
        "body-not-afflicted": (f"{body} is unafflicted", f"{body} is afflicted by a malefic"),
        "body-not-afflicted-by-sect-malefic": (
            f"{body} is clear of the malefic contrary to the sect",
            f"{body} is afflicted by the malefic contrary to the sect",
        ),
        "body-received": (f"{body} is received", f"{body} is not received"),
        "hour-of-benefic": ("The hour of a benefic", "Not a benefic's hour"),
        "hour-friendly-to": (
            f"The hour's lord regards {body} kindly",
            f"The hour's lord does not regard {body} kindly",
        ),
        "configured-to": (
            f"{body} is in {made} with {other}", f"{body} is not in {made} with {other}",
        ),
        "not-configured-to": (
            f"{body} is not in {made} with {other}", f"{body} is in {made} with {other}",
        ),
    }
    yes, no = table.get(c, ("", ""))
    return (yes if held else no).replace("  ", " ")


def _lower_article(sentence: str) -> str:
    """Mid-sentence, a leading article drops its capital; a proper noun keeps it."""
    if sentence.split(" ", 1)[0] in ("The", "A", "No", "Not", "Neither"):
        return sentence[:1].lower() + sentence[1:]
    return sentence


def _share_subject(sayings: list[str]) -> str:
    if len(sayings) < 2:
        return _listed(sayings)
    at = sayings[0].find(" is ")
    if at > 0:
        subject = sayings[0][: at + 4]
        if all(s.startswith(subject) for s in sayings):
            return subject + _listed([s[len(subject):] for s in sayings])
    return _listed(sayings)


def _listed(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


# ── walking the span ─────────────────────────────────────────────────────


@dataclass(frozen=True)
class Window:
    from_: datetime
    until: datetime
    judgement: Judgement

    @property
    def is_vetoed(self) -> bool:
        return self.judgement.is_vetoed

    @property
    def fraction(self) -> float | None:
        return self.judgement.fraction


def merge(samples: list[Judgement], step: timedelta) -> list[Window]:
    """Fold judged samples into runs that judged ALIKE — compared by which
    clauses held, not by score, so a window's stated reasons are true for
    the whole of it."""
    if not samples:
        return []
    windows: list[Window] = []
    opened_at = samples[0].at
    opening = samples[0]
    for j in samples[1:]:
        if len(j.findings) == len(opening.findings) and all(
            a.held == b.held for a, b in zip(j.findings, opening.findings, strict=True)
        ):
            continue
        windows.append(Window(from_=opened_at, until=j.at, judgement=opening))
        opened_at, opening = j.at, j
    windows.append(Window(from_=opened_at, until=samples[-1].at + step, judgement=opening))
    return windows


WELL_AT = 0.6


def sort_windows(
    windows: list[Window], *, well_at: float = WELL_AT, best: int = 5,
) -> tuple[list[Window], list[Window], list[Window]]:
    """(favourable, weaker, ruled_out). A window has to EARN being offered —
    60% of the ruleset's own best — and where nothing clears the bar the
    strongest are offered anyway with the shortfall visible, because "the
    best of a poor week" is a real answer and silence is a different claim."""
    standing = [w for w in windows if not w.is_vetoed]
    ruled_out = [w for w in windows if w.is_vetoed]
    standing.sort(key=lambda w: (-(w.fraction or 0.0), w.from_))
    cut = next(
        (i for i, w in enumerate(standing) if (w.fraction or 0.0) < well_at),
        len(standing),
    )
    if cut == 0:
        cut = min(len(standing), best)
    return standing[:cut], standing[cut:], ruled_out


class _HourBook:
    """Per-day planetary hours, cached — the arc is a search, and a week at
    fifteen minutes was performing seven hundred of them to learn seven."""

    def __init__(self, latitude: float, longitude: float) -> None:
        self._lat = latitude
        self._lng = longitude
        self._days: dict[str, list] = {}

    def at(self, instant: datetime) -> tuple[str | None, str | None]:
        for probe in (instant, instant - timedelta(days=1)):
            key = probe.date().isoformat()
            hours = self._days.get(key)
            if hours is None:
                try:
                    hours = compute_planetary_hours(probe, self._lat, self._lng)
                except Exception:
                    hours = []
                self._days[key] = hours
            for h in hours:
                if h.start <= instant < h.end:
                    day_ruler = hours[0].ruler.value if hours else None
                    return h.ruler.value, day_ruler
        return None, None


def _moment_at(
    instant: datetime,
    latitude: float,
    longitude: float,
    hour_book: _HourBook,
    doctrine,
    ingress_box: list[datetime | None],
) -> Moment:
    chart = compute_chart(ChartRequest(
        instant=instant,
        latitude=latitude,
        longitude=longitude,
        house_system=HouseSystem.WHOLE_SIGN,
    ))
    positions = {
        p.body.id: BodyAt(longitude=p.tropical.longitude, speed=p.speed)
        for p in chart.placements
        if p.body.id in CLASSICAL
    }
    asc = chart.ascendant.longitude
    sect = determine(positions["sun"].longitude, asc).sect

    moon = positions.get("moon")
    moon_void = False
    if moon is not None:
        if doctrine.void_of_course == "signExit":
            ingress = ingress_box[0]
            if ingress is None or instant >= ingress:
                ingress = moon_next_sign_ingress(instant)
                ingress_box[0] = ingress
            hours_left = (ingress - instant).total_seconds() / 3600.0
            moon_void = not _perfects_within_hours(moon, positions, hours_left)
        else:
            moon_void = not _perfects_within_moon_travel(moon, positions, 30.0)

    hour_ruler, day_ruler = hour_book.at(instant)
    return Moment(
        at=instant,
        positions=positions,
        ascendant=asc,
        sect=sect,
        hour_ruler=hour_ruler,
        day_ruler=day_ruler,
        moon_void=moon_void,
    )


def elect(
    ruleset: dict,
    *,
    start: datetime,
    end: datetime,
    step: timedelta,
    latitude: float,
    longitude: float,
    doctrine,
    subject_body: str | None = None,
    subject_house: int | None = None,
) -> tuple[Rules, list[Window]]:
    """Walk the span and judge it. Sampling, not solving — every window has
    a moment behind it that was actually evaluated."""
    rules = parse_ruleset(ruleset, subject_body=subject_body, subject_house=subject_house)
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    hour_book = _HourBook(latitude, longitude)
    ingress_box: list[datetime | None] = [None]
    samples: list[Judgement] = []
    at = start
    while at < end:
        moment = _moment_at(at, latitude, longitude, hour_book, doctrine, ingress_box)
        samples.append(judge(rules, moment, doctrine))
        at = at + step
    return rules, merge(samples, step)
