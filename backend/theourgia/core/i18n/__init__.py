"""Internationalization substrate.

Every user-facing string in Theourgia flows through this package. The
canonical call points are :func:`gettext` (aliased as :func:`_`),
:func:`ngettext` for plural-aware messages, and the ``_lazy`` variants
for strings defined at module-import time.

Locale resolution is per-request, propagated via :mod:`contextvars`:

- :class:`LocaleMiddleware` extracts ``Accept-Language`` and binds the
  negotiated locale to the request's context. Every ``_()`` call
  inside the request body picks it up automatically.
- Outside an HTTP request (Celery tasks, CLI scripts), code that wants
  a specific locale calls :func:`bind_locale` directly; otherwise the
  default locale applies.

The translator itself is provider-pluggable: production uses Babel-
compiled ``.mo`` catalogs on disk; tests use the
:class:`InMemoryCatalog`. Code never references either directly — it
calls ``_()`` and the configured translator does the lookup.

Implementation note — **do not import translators at module scope**.
Use :func:`_lazy` for any string that needs to be a module-level
constant; otherwise the translation freezes at import time and ignores
per-request locale binding.
"""

from __future__ import annotations

from theourgia.core.i18n.catalog import Catalog, InMemoryCatalog
from theourgia.core.i18n.lazy import LazyString
from theourgia.core.i18n.locale import (
    bind_locale,
    clear_locale,
    get_current_locale,
)
from theourgia.core.i18n.middleware import LocaleMiddleware
from theourgia.core.i18n.negotiation import (
    negotiate_locale,
    parse_accept_language,
)
from theourgia.core.i18n.translator import (
    BabelTranslator,
    Translator,
    configure_translator,
    get_translator,
    gettext,
    gettext_lazy,
    ngettext,
    ngettext_lazy,
)

# Canonical short aliases. Importing ``_`` is the conventional pattern.
_ = gettext
_lazy = gettext_lazy
_n = ngettext
_n_lazy = ngettext_lazy


__all__ = [
    "BabelTranslator",
    "Catalog",
    "InMemoryCatalog",
    "LazyString",
    "LocaleMiddleware",
    "Translator",
    "_",
    "_lazy",
    "_n",
    "_n_lazy",
    "bind_locale",
    "clear_locale",
    "configure_translator",
    "get_current_locale",
    "get_translator",
    "gettext",
    "gettext_lazy",
    "negotiate_locale",
    "ngettext",
    "ngettext_lazy",
    "parse_accept_language",
]
