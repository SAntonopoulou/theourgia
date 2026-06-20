"""Settings-definition registry.

Each setting a feature exposes is declared once via
:func:`register_setting`:

- ``key`` — stable dotted identifier (``"ui.theme"``,
  ``"editor.font_family"``, ``"federation.publish_on_save"``)
- ``value_type`` — the type the stored JSON should deserialize to
  (``str``, ``int``, ``bool``, ``list[str]``, etc.)
- ``default`` — what the reader gets when no row exists for this user
- ``allowed_values`` — optional finite set (for enum-shaped settings)
- ``min_value`` / ``max_value`` — optional bounds for numeric settings
- ``description`` — one-line summary for the admin UI / settings catalog
- ``deprecated`` / ``replaces`` — schema-evolution helpers

Registration is import-time; the registry is read-mostly thereafter.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any, Final

__all__ = [
    "SettingDefinition",
    "SettingsRegistry",
    "default_settings_registry",
    "register_setting",
]


@dataclass(frozen=True, slots=True)
class SettingDefinition:
    """A registered setting key.

    The value_type is reflective; the substrate uses ``isinstance``
    plus minimal coercion (``int(value)`` for numeric strings, etc.).
    Features can register more elaborate validators by passing
    ``validator`` — a callable that takes the raw value and returns
    the coerced final value or raises ``ValueError``.
    """

    key: str
    value_type: type
    default: Any
    description: str = ""
    allowed_values: tuple[Any, ...] | None = None
    min_value: float | int | None = None
    max_value: float | int | None = None
    deprecated: bool = False
    replaces: str | None = None
    """When this key supersedes another, list the old key here. The
    substrate looks up the old key as a fallback during reads, so
    callers don't see a regression for users who set the old key but
    not the new one."""

    def __post_init__(self) -> None:
        if not self.key or "." not in self.key:
            raise ValueError(
                f"setting key must be dotted (e.g. 'ui.theme'); got {self.key!r}"
            )
        if self.allowed_values is not None and self.default not in self.allowed_values:
            raise ValueError(
                f"default {self.default!r} not in allowed_values for {self.key!r}"
            )

    def validate(self, value: Any) -> Any:
        """Coerce + validate ``value`` against the definition. Returns
        the normalized value or raises ``ValueError``.

        Allowed values are matched before type coercion (so an
        ``allowed_values=("light", "dark", "auto")`` setting accepts
        strings exactly)."""
        if self.allowed_values is not None:
            if value not in self.allowed_values:
                raise ValueError(
                    f"value {value!r} not in allowed_values for {self.key!r}: "
                    f"{self.allowed_values}"
                )
            return value

        if not isinstance(value, self.value_type):
            # Mild coercion: numeric strings → numbers, bool-shaped
            # strings → bools. Anything more exotic should be done by a
            # custom validator at the call site.
            if self.value_type is bool and isinstance(value, str):
                lowered = value.strip().lower()
                if lowered in {"true", "yes", "1", "on"}:
                    return True
                if lowered in {"false", "no", "0", "off"}:
                    return False
                raise ValueError(
                    f"{self.key!r}: cannot coerce {value!r} to bool"
                )
            try:
                value = self.value_type(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"{self.key!r}: cannot coerce {value!r} to "
                    f"{self.value_type.__name__}"
                ) from exc

        if isinstance(value, (int, float)):
            if self.min_value is not None and value < self.min_value:
                raise ValueError(
                    f"{self.key!r}: value {value} below minimum {self.min_value}"
                )
            if self.max_value is not None and value > self.max_value:
                raise ValueError(
                    f"{self.key!r}: value {value} above maximum {self.max_value}"
                )

        return value


class SettingsRegistry:
    """Names → :class:`SettingDefinition`."""

    def __init__(self) -> None:
        self._defs: dict[str, SettingDefinition] = {}
        self._aliases: dict[str, str] = {}
        """Maps old key → new key for replaced settings."""

    def register(
        self,
        definition: SettingDefinition,
        *,
        overwrite: bool = False,
    ) -> SettingDefinition:
        if definition.key in self._defs and not overwrite:
            msg = (
                f"setting already registered: {definition.key!r}; "
                "pass overwrite=True if intentional"
            )
            raise ValueError(msg)
        self._defs[definition.key] = definition
        if definition.replaces:
            self._aliases[definition.replaces] = definition.key
        return definition

    def get(self, key: str) -> SettingDefinition:
        if key in self._defs:
            return self._defs[key]
        # Follow alias chain (old → new) for migrations in progress
        if key in self._aliases:
            return self._defs[self._aliases[key]]
        raise KeyError(f"setting not registered: {key!r}")

    def has(self, key: str) -> bool:
        return key in self._defs or key in self._aliases

    def alias_of(self, old_key: str) -> str | None:
        """Return the new key that supersedes ``old_key``, if any."""
        return self._aliases.get(old_key)

    def all(self) -> list[SettingDefinition]:
        return list(self._defs.values())

    def by_namespace(self, namespace: str) -> list[SettingDefinition]:
        """All keys whose dotted prefix matches ``namespace`` (e.g.
        ``"ui"`` returns ``ui.theme`` / ``ui.density`` / etc.)."""
        prefix = namespace.rstrip(".") + "."
        return [d for d in self._defs.values() if d.key.startswith(prefix)]

    def clear(self) -> None:
        """Reset. Tests only."""
        self._defs.clear()
        self._aliases.clear()


default_settings_registry: Final[SettingsRegistry] = SettingsRegistry()
"""Process-wide settings registry."""


def register_setting(
    key: str,
    value_type: type,
    default: Any,
    *,
    description: str = "",
    allowed_values: Sequence[Any] | None = None,
    min_value: float | int | None = None,
    max_value: float | int | None = None,
    deprecated: bool = False,
    replaces: str | None = None,
    registry: SettingsRegistry | None = None,
) -> SettingDefinition:
    """Register a per-user setting key at import time.

    Returns the constructed :class:`SettingDefinition` so callers can
    keep a typed reference (handy for autocomplete and grep).
    """
    target = registry or default_settings_registry
    return target.register(
        SettingDefinition(
            key=key,
            value_type=value_type,
            default=default,
            description=description,
            allowed_values=tuple(allowed_values) if allowed_values else None,
            min_value=min_value,
            max_value=max_value,
            deprecated=deprecated,
            replaces=replaces,
        )
    )
