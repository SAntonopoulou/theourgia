"""Construct the process-wide translator from settings.

Called once at app start (FastAPI lifespan) and once at Celery-worker
start. Tests construct translators directly with
:class:`InMemoryCatalog` instances.
"""

from __future__ import annotations

from pathlib import Path

from theourgia.core.i18n.translator import (
    BabelTranslator,
    Translator,
    configure_translator,
)

__all__ = ["build_translator_from_settings"]


def build_translator_from_settings(settings: object) -> Translator:
    """Build a :class:`BabelTranslator` from the app settings and
    install it as the process-wide translator."""
    default_locale = getattr(settings, "default_locale", "en") or "en"
    supported = tuple(
        getattr(settings, "supported_locales", None) or [default_locale]
    )
    locales_path = Path(
        getattr(settings, "locales_path", None) or Path("backend/locales")
    )

    translator = BabelTranslator(
        locales_path=locales_path,
        default_locale=default_locale,
        supported_locales=supported,
    )
    configure_translator(translator)
    return translator
