"""Per-user rite configuration — the single resolution path.

The four-station daily rite is preset-driven per user (v1-058): three
``resh.*`` user-setting keys select the preset, layer per-station
overrides, and pick the streak-anchoring station. This module owns
the *resolution* of those keys so every consumer — the
``/api/v1/resh/*`` endpoints AND non-HTTP surfaces like the iCal feed
walker — reads a user's rite through the same path and can never
drift apart.

Resolution rules (identical to the original router implementation):

* Malformed setting rows (bad JSON, wrong shapes) are silently
  skipped — resolution NEVER raises; it falls back to defaults.
* An unknown preset name falls back to :data:`DEFAULT_PRESET`.
* An unknown minimum-viable-station falls back to
  :data:`DEFAULT_MINIMUM_VIABLE_STATION`.
* Station overrides accept only the three known string fields
  (``godform`` / ``direction`` / ``short_invocation``) on known
  transitions; anything else is dropped.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from sqlalchemy import select

from theourgia.core.resh.adorations import (
    DEFAULT_MINIMUM_VIABLE_STATION,
    DEFAULT_PRESET,
    PRESETS,
    Adoration,
    Transition,
    stations_for_preset,
)
from theourgia.models.usersettings import UserSetting

if TYPE_CHECKING:
    from collections.abc import Mapping

    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "MIN_STATION_KEY",
    "PRESET_KEY",
    "STATIONS_KEY",
    "STATION_OVERRIDE_FIELDS",
    "ResolvedRiteConfig",
    "apply_station_overrides",
    "resolve_rite_config",
]


# The well-known user-setting keys (same row shape the user-settings
# router writes).
PRESET_KEY = "resh.preset"
STATIONS_KEY = "resh.stations"
MIN_STATION_KEY = "resh.minimum_viable_station"

# The only override fields a station accepts.
STATION_OVERRIDE_FIELDS: tuple[str, ...] = (
    "godform",
    "direction",
    "short_invocation",
)


@dataclass(frozen=True, slots=True)
class ResolvedRiteConfig:
    """A user's rite configuration, resolved and validated.

    ``overrides`` maps a transition to the subset of
    :data:`STATION_OVERRIDE_FIELDS` the user replaced (values are the
    raw strings, exactly as stored).
    """

    preset: str = DEFAULT_PRESET
    minimum_viable_station: Transition = DEFAULT_MINIMUM_VIABLE_STATION
    overrides: Mapping[Transition, Mapping[str, str]] = field(
        default_factory=dict,
    )

    def effective_stations(self) -> dict[Transition, Adoration]:
        """The preset's stations with this user's overrides applied."""
        return apply_station_overrides(self.preset, self.overrides)


def apply_station_overrides(
    preset: str,
    overrides: Mapping[Transition, Mapping[str, str]],
) -> dict[Transition, Adoration]:
    """The named preset's stations with per-station overrides layered.

    A ``short_invocation`` override is a plain string and replaces the
    preset's invocation for BOTH liturgy modes; without one, the
    preset's form (single string or per-mode mapping) passes through
    untouched. Empty-string override values fall back to the preset,
    same as absent ones.
    """
    stations = stations_for_preset(preset)
    for t, fields in overrides.items():
        base = stations[t]
        stations[t] = Adoration(
            transition=t,
            godform=fields.get("godform") or base.godform,
            direction=fields.get("direction") or base.direction,
            short_invocation=(
                fields.get("short_invocation") or base.short_invocation
            ),
        )
    return stations


async def resolve_rite_config(
    db: AsyncSession, user_id,
) -> ResolvedRiteConfig:
    """Read a user's rite configuration from the ``user_setting``
    table (the same well-known-key pattern as the location + calendar
    settings). Malformed rows fall back to defaults — never raise.
    """
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id,
        UserSetting.key.in_((PRESET_KEY, STATIONS_KEY, MIN_STATION_KEY)),
    )
    rows = (await db.execute(stmt)).scalars().all()
    values: dict[str, object] = {}
    for row in rows:
        try:
            values[row.key] = json.loads(row.value_json)
        except (ValueError, TypeError):
            continue

    preset = values.get(PRESET_KEY)
    if preset not in PRESETS:
        preset = DEFAULT_PRESET

    transition_values = {t.value for t in Transition}

    min_station = values.get(MIN_STATION_KEY)
    if min_station in transition_values:
        min_station = Transition(min_station)
    else:
        min_station = DEFAULT_MINIMUM_VIABLE_STATION

    overrides: dict[Transition, dict[str, str]] = {}
    raw_stations = values.get(STATIONS_KEY)
    if isinstance(raw_stations, dict):
        for key, val in raw_stations.items():
            if key not in transition_values:
                continue
            if not isinstance(val, dict):
                continue
            fields = {
                f: val[f]
                for f in STATION_OVERRIDE_FIELDS
                if isinstance(val.get(f), str)
            }
            if fields:
                overrides[Transition(key)] = fields

    return ResolvedRiteConfig(
        preset=preset,  # type: ignore[arg-type]
        minimum_viable_station=min_station,
        overrides=overrides,
    )
