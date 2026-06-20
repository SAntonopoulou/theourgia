"""Instance-setting definition registry.

Mirrors the per-user settings registry (S10) but adds a ``public``
flag controlling who can read each setting:

- ``public=True``  — any visitor (including anonymous) can read.
  Use sparingly: only for things the homepage / signup screen / etc.
  need to know without an auth round trip.
- ``public=False`` (default) — only authenticated admins read.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any, Final

__all__ = [
    "InstanceSettingDefinition",
    "InstanceSettingsRegistry",
    "default_instance_settings_registry",
    "register_instance_setting",
]


@dataclass(frozen=True, slots=True)
class InstanceSettingDefinition:
    """A registered instance-setting key.

    Shares its validation behaviour with the per-user
    :class:`SettingDefinition`. The differences are conceptual
    (instance-scoped vs user-scoped) and structural (the ``public``
    flag governing read visibility)."""

    key: str
    value_type: type
    default: Any
    description: str = ""
    public: bool = False
    """When True, unauthenticated / non-admin callers can read.
    Default False — admin-only read."""
    allowed_values: tuple[Any, ...] | None = None
    min_value: float | int | None = None
    max_value: float | int | None = None
    deprecated: bool = False
    replaces: str | None = None

    def __post_init__(self) -> None:
        if not self.key or "." not in self.key:
            raise ValueError(
                f"instance setting key must be dotted; got {self.key!r}"
            )
        if self.allowed_values is not None and self.default not in self.allowed_values:
            raise ValueError(
                f"default {self.default!r} not in allowed_values for {self.key!r}"
            )

    def validate(self, value: Any) -> Any:
        """Coerce + validate ``value``. Same rules as the per-user
        equivalent — see :meth:`SettingDefinition.validate`."""
        if self.allowed_values is not None:
            if value not in self.allowed_values:
                raise ValueError(
                    f"value {value!r} not in allowed_values for {self.key!r}: "
                    f"{self.allowed_values}"
                )
            return value

        if not isinstance(value, self.value_type):
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


class InstanceSettingsRegistry:
    """Names → :class:`InstanceSettingDefinition`."""

    def __init__(self) -> None:
        self._defs: dict[str, InstanceSettingDefinition] = {}
        self._aliases: dict[str, str] = {}

    def register(
        self,
        definition: InstanceSettingDefinition,
        *,
        overwrite: bool = False,
    ) -> InstanceSettingDefinition:
        if definition.key in self._defs and not overwrite:
            raise ValueError(
                f"instance setting already registered: {definition.key!r}"
            )
        self._defs[definition.key] = definition
        if definition.replaces:
            self._aliases[definition.replaces] = definition.key
        return definition

    def get(self, key: str) -> InstanceSettingDefinition:
        if key in self._defs:
            return self._defs[key]
        if key in self._aliases:
            return self._defs[self._aliases[key]]
        raise KeyError(f"instance setting not registered: {key!r}")

    def has(self, key: str) -> bool:
        return key in self._defs or key in self._aliases

    def all(self) -> list[InstanceSettingDefinition]:
        return list(self._defs.values())

    def public(self) -> list[InstanceSettingDefinition]:
        """Subset readable by anonymous / non-admin callers."""
        return [d for d in self._defs.values() if d.public and not d.deprecated]

    def by_namespace(
        self, namespace: str
    ) -> list[InstanceSettingDefinition]:
        prefix = namespace.rstrip(".") + "."
        return [d for d in self._defs.values() if d.key.startswith(prefix)]

    def clear(self) -> None:
        self._defs.clear()
        self._aliases.clear()


default_instance_settings_registry: Final[InstanceSettingsRegistry] = (
    InstanceSettingsRegistry()
)


def register_instance_setting(
    key: str,
    value_type: type,
    default: Any,
    *,
    description: str = "",
    public: bool = False,
    allowed_values: Sequence[Any] | None = None,
    min_value: float | int | None = None,
    max_value: float | int | None = None,
    deprecated: bool = False,
    replaces: str | None = None,
    registry: InstanceSettingsRegistry | None = None,
) -> InstanceSettingDefinition:
    """Register an instance-wide setting at import time."""
    target = registry or default_instance_settings_registry
    return target.register(
        InstanceSettingDefinition(
            key=key,
            value_type=value_type,
            default=default,
            description=description,
            public=public,
            allowed_values=tuple(allowed_values) if allowed_values else None,
            min_value=min_value,
            max_value=max_value,
            deprecated=deprecated,
            replaces=replaces,
        )
    )
