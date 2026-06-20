"""Translator — the engine behind ``_()``.

A :class:`Translator` is constructed once at process start and
configured via :func:`configure_translator`. Subsequent
``gettext`` / ``ngettext`` calls route through the configured
translator, which selects the right :class:`Catalog` based on the
contextvar-bound locale.

Production setup uses :class:`BabelTranslator` loading ``.mo``
catalogs from disk. Tests use a translator constructed from
:class:`InMemoryCatalog` instances.

Thread-safety: the translator caches per-locale catalogs after first
load; subsequent reads are lock-free. Catalog construction itself is
not protected — concurrent first-time loads of the same locale do
redundant work but don't corrupt state.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Final, Protocol, runtime_checkable

from theourgia.core.i18n.catalog import (
    BabelCatalog,
    Catalog,
    InMemoryCatalog,
)
from theourgia.core.i18n.lazy import LazyString
from theourgia.core.i18n.locale import get_current_locale

__all__ = [
    "BabelTranslator",
    "Translator",
    "configure_translator",
    "get_translator",
    "gettext",
    "gettext_lazy",
    "ngettext",
    "ngettext_lazy",
    "reset_translator",
]


@runtime_checkable
class Translator(Protocol):
    """The translation engine. Implementations resolve a locale to a
    :class:`Catalog` and forward the lookup."""

    default_locale: str
    supported_locales: tuple[str, ...]

    def catalog_for(self, locale: str) -> Catalog:
        """Return the catalog for ``locale``. Falls back to the default
        locale on miss."""
        ...

    def gettext(self, message: str, locale: str | None = None) -> str:
        ...

    def ngettext(
        self, singular: str, plural: str, n: int, locale: str | None = None
    ) -> str:
        ...


class _BaseTranslator:
    """Shared logic between catalog-loading translators."""

    def __init__(
        self,
        default_locale: str,
        supported_locales: tuple[str, ...],
    ) -> None:
        if not default_locale:
            raise ValueError("default_locale must not be empty")
        if not supported_locales:
            supported_locales = (default_locale,)
        if default_locale not in supported_locales:
            raise ValueError(
                f"default_locale {default_locale!r} not in supported_locales {supported_locales!r}"
            )
        self.default_locale = default_locale
        self.supported_locales = tuple(supported_locales)
        self._cache: dict[str, Catalog] = {}

    def _resolve_locale(self, locale: str | None) -> str:
        active = locale or get_current_locale() or self.default_locale
        if active not in self.supported_locales:
            # Unknown / unsupported — fall back gracefully
            return self.default_locale
        return active

    def gettext(self, message: str, locale: str | None = None) -> str:
        return self.catalog_for(self._resolve_locale(locale)).gettext(message)

    def ngettext(
        self, singular: str, plural: str, n: int, locale: str | None = None
    ) -> str:
        return self.catalog_for(self._resolve_locale(locale)).ngettext(
            singular, plural, n
        )

    def catalog_for(self, locale: str) -> Catalog:  # pragma: no cover - overridden
        raise NotImplementedError


class InMemoryTranslator(_BaseTranslator):
    """Translator backed by a dict of :class:`InMemoryCatalog`s.

    Used by tests; production uses :class:`BabelTranslator`.
    """

    def __init__(
        self,
        catalogs: dict[str, Catalog],
        *,
        default_locale: str = "en",
    ) -> None:
        super().__init__(default_locale, tuple(catalogs.keys()))
        self._catalogs = catalogs

    def catalog_for(self, locale: str) -> Catalog:
        return self._catalogs.get(locale) or self._catalogs[self.default_locale]


class BabelTranslator(_BaseTranslator):
    """Translator that loads catalogs from a Babel ``.mo`` directory tree.

    Layout::

        locales_path/
            en/LC_MESSAGES/messages.mo
            es/LC_MESSAGES/messages.mo
            fr/LC_MESSAGES/messages.mo

    Catalogs are loaded lazily on first request for each locale and
    cached. If a ``.mo`` is missing, the loaded catalog passes
    untranslated strings through (Babel returns the original message
    on miss).
    """

    def __init__(
        self,
        *,
        locales_path: Path,
        default_locale: str = "en",
        supported_locales: tuple[str, ...] = ("en",),
        domain: str = "messages",
    ) -> None:
        super().__init__(default_locale, supported_locales)
        self._locales_path = locales_path
        self._domain = domain

    def catalog_for(self, locale: str) -> Catalog:
        if locale in self._cache:
            return self._cache[locale]
        try:
            catalog = BabelCatalog(
                locale, self._locales_path, domain=self._domain
            )
        except Exception:  # noqa: BLE001 — fall back to default on any load failure
            if locale == self.default_locale:
                # Default locale couldn't load — use a passthrough catalog
                catalog = InMemoryCatalog(self.default_locale)
            else:
                catalog = self.catalog_for(self.default_locale)
        self._cache[locale] = catalog
        return catalog


# ── Process-wide translator ──────────────────────────────────────────


_translator: Translator | None = None


def configure_translator(translator: Translator | None) -> None:
    """Install the process-wide translator.

    Called once at app start (by :mod:`theourgia.api.app`) and at
    Celery-worker start. Tests construct their own translator and
    install it via this function inside a fixture.
    """
    global _translator
    _translator = translator


def reset_translator() -> None:
    """Clear the configured translator. Test fixtures only."""
    global _translator
    _translator = None


def get_translator() -> Translator:
    """Return the configured translator, or a passthrough default."""
    if _translator is None:
        return _PASSTHROUGH
    return _translator


# Sentinel translator used when no real translator has been configured.
# Returns the source string unchanged — useful for early-startup code
# that emits user-facing strings before the app has fully initialized.
_PASSTHROUGH: Final[Translator] = InMemoryTranslator(
    {"en": InMemoryCatalog("en")}, default_locale="en"
)


# ── Convenience functions (the canonical call points) ───────────────


def gettext(message: str, **substitutions: object) -> str:
    """Translate ``message`` to the current locale.

    Optional keyword arguments are applied via :meth:`str.format` after
    translation — let translators decide where to place dynamic values
    in their target-language word order.
    """
    translated = get_translator().gettext(message)
    if substitutions:
        return translated.format(**substitutions)
    return translated


def ngettext(
    singular: str, plural: str, n: int, **substitutions: object
) -> str:
    """Translate, choosing the plural form appropriate for ``n``.

    Substitutions are applied after lookup; ``n`` itself is available
    as ``{n}`` without needing to be passed explicitly."""
    translated = get_translator().ngettext(singular, plural, n)
    return translated.format(n=n, **substitutions)


def gettext_lazy(message: str, **substitutions: object) -> LazyString:
    """A :class:`LazyString` over :func:`gettext`.

    Use for module-level constants — the lookup happens when the value
    is converted to ``str``, not at import time.
    """

    def _resolve() -> str:
        return gettext(message, **substitutions)

    return LazyString(_resolve)


def ngettext_lazy(
    singular: str, plural: str, n: int, **substitutions: object
) -> LazyString:
    """Lazy variant of :func:`ngettext`."""

    def _resolve() -> str:
        return ngettext(singular, plural, n, **substitutions)

    return LazyString(_resolve)
