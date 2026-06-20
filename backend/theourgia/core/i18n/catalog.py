"""Message-catalog abstractions.

A :class:`Catalog` carries the translations for one locale. The
:class:`Translator` consults a catalog per locale and falls back when
a translation is missing.

Two implementations:

- :class:`InMemoryCatalog` — Python-dict backed. Used by tests and by
  programmatic catalog construction.
- :class:`BabelCatalog` — wraps :class:`babel.support.Translations`
  loaded from a compiled ``.mo`` file. Used in production.

The interface is intentionally tiny — :meth:`gettext` and
:meth:`ngettext`. More elaborate APIs (context-aware ``pgettext``,
domain switching, fluent interpolation) come back when a feature
genuinely needs them.
"""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Protocol, runtime_checkable

__all__ = ["BabelCatalog", "Catalog", "InMemoryCatalog"]


@runtime_checkable
class Catalog(Protocol):
    """A localized message catalog."""

    locale: str

    def gettext(self, message: str) -> str:
        """Return the translation of ``message``, or the original on miss."""
        ...

    def ngettext(self, singular: str, plural: str, n: int) -> str:
        """Return the plural form appropriate for ``n``."""
        ...


class InMemoryCatalog:
    """Python-dict backed catalog. Tests and ad-hoc programmatic use.

    Plural messages are stored as tuples keyed by the singular form:

        InMemoryCatalog(
            "es",
            messages={"Hello": "Hola"},
            plurals={
                ("entries", "entries"): {  # (singular, plural)
                    "one": "$n entrada",
                    "other": "$n entradas",
                },
            },
        )

    Plural rules follow CLDR categories. The InMemoryCatalog applies a
    simple ``n == 1`` rule — enough for English-family languages.
    Production catalogs (Babel) use the full CLDR plural rules from
    each language's ``.po`` header.
    """

    def __init__(
        self,
        locale: str,
        *,
        messages: Mapping[str, str] | None = None,
        plurals: Mapping[tuple[str, str], Mapping[str, str]] | None = None,
    ) -> None:
        self.locale = locale
        self._messages: dict[str, str] = dict(messages or {})
        self._plurals: dict[tuple[str, str], dict[str, str]] = {
            k: dict(v) for k, v in (plurals or {}).items()
        }

    def gettext(self, message: str) -> str:
        return self._messages.get(message, message)

    def ngettext(self, singular: str, plural: str, n: int) -> str:
        forms = self._plurals.get((singular, plural))
        if not forms:
            return singular if n == 1 else plural
        category = "one" if n == 1 else "other"
        return forms.get(category, singular if n == 1 else plural)


class BabelCatalog:
    """Wraps :class:`babel.support.Translations` over a compiled ``.mo``.

    Construction loads the catalog eagerly so we fail fast on missing
    files. The Babel translations object handles CLDR plural rules
    per the catalog's ``Plural-Forms`` header.
    """

    def __init__(self, locale: str, locales_path: Path, *, domain: str = "messages") -> None:
        self.locale = locale
        # Lazy import keeps Babel out of the import graph for tests
        # that use InMemoryCatalog and don't need Babel installed.
        from babel.support import Translations

        self._translations = Translations.load(
            str(locales_path), [locale], domain=domain
        )

    def gettext(self, message: str) -> str:
        return self._translations.gettext(message)

    def ngettext(self, singular: str, plural: str, n: int) -> str:
        return self._translations.ngettext(singular, plural, n)
