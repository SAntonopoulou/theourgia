"""Lazy translation strings.

For strings defined at module-import time, an immediate ``_()`` call
would freeze the translation to the import-time locale (typically the
default, since no request has bound one yet). A :class:`LazyString`
defers the lookup until its value is actually read — by which time the
right locale is bound.

Use :func:`gettext_lazy` (re-exported from
:mod:`theourgia.core.i18n.translator`) for module-level constants:

.. code-block:: python

    PASSWORD_TOO_SHORT = _lazy("Password must be at least 8 characters.")
    # Later, inside a request:
    raise ValidationFailedError(str(PASSWORD_TOO_SHORT))

Comparison and string concatenation work as expected — anywhere
Python coerces the value to ``str``, the translation is performed.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

__all__ = ["LazyString"]


class LazyString:
    """A string-equivalent value whose translation is resolved on access.

    Two flavours of lazy resolver:

    - Plain ``gettext`` — ``func`` takes no args, returns the
      translated string for the current locale.
    - With substitutions — caller passes ``substitutions`` and a
      function that does ``.format(**substitutions)`` after lookup.

    Instances are intentionally NOT hashable: they would compare equal
    to different strings in different locales, which is the wrong
    semantic for hash-table keys."""

    __slots__ = ("_resolver",)

    def __init__(self, resolver: Callable[[], str]) -> None:
        self._resolver = resolver

    def __str__(self) -> str:
        return self._resolver()

    def __repr__(self) -> str:
        return f"LazyString({self._resolver()!r})"

    def __eq__(self, other: object) -> bool:
        if isinstance(other, LazyString):
            return str(self) == str(other)
        if isinstance(other, str):
            return str(self) == other
        return NotImplemented

    def __ne__(self, other: object) -> bool:
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __add__(self, other: Any) -> str:
        return str(self) + str(other)

    def __radd__(self, other: Any) -> str:
        return str(other) + str(self)

    def __len__(self) -> int:
        return len(str(self))

    def __bool__(self) -> bool:
        return bool(str(self))

    def __mod__(self, other: Any) -> str:
        # Permits LazyString % args, used by some logging code.
        return str(self) % other

    # Hashing is deliberately disabled — see class docstring.
    __hash__ = None  # type: ignore[assignment]
