"""Tests for the translator and convenience functions."""

from __future__ import annotations

import pytest

from theourgia.core.i18n.catalog import InMemoryCatalog
from theourgia.core.i18n.locale import (
    bind_locale,
    clear_locale,
)
from theourgia.core.i18n.translator import (
    InMemoryTranslator,
    configure_translator,
    get_translator,
    gettext,
    gettext_lazy,
    ngettext,
    ngettext_lazy,
    reset_translator,
)


@pytest.fixture(autouse=True)
def _reset() -> None:
    """Each test starts with a clean slate — no configured translator,
    no bound locale."""
    reset_translator()
    clear_locale()
    yield
    reset_translator()
    clear_locale()


def _build_translator() -> InMemoryTranslator:
    return InMemoryTranslator(
        {
            "en": InMemoryCatalog(
                "en",
                messages={"Hello": "Hello", "Goodbye": "Goodbye"},
                plurals={
                    ("{n} entry", "{n} entries"): {
                        "one": "{n} entry",
                        "other": "{n} entries",
                    },
                },
            ),
            "es": InMemoryCatalog(
                "es",
                messages={"Hello": "Hola", "Goodbye": "Adiós"},
                plurals={
                    ("{n} entry", "{n} entries"): {
                        "one": "{n} entrada",
                        "other": "{n} entradas",
                    },
                },
            ),
            "fr": InMemoryCatalog(
                "fr",
                messages={"Hello": "Bonjour"},
            ),
        },
        default_locale="en",
    )


# ── Translator construction ──────────────────────────────────────────


def test_translator_default_locale_must_be_in_supported() -> None:
    with pytest.raises(ValueError, match="default_locale"):
        InMemoryTranslator(
            {"es": InMemoryCatalog("es")},
            default_locale="en",
        )


def test_translator_default_locale_required() -> None:
    with pytest.raises(ValueError, match="default_locale"):
        InMemoryTranslator({"en": InMemoryCatalog("en")}, default_locale="")


def test_translator_lists_supported_locales() -> None:
    t = _build_translator()
    assert "en" in t.supported_locales
    assert "es" in t.supported_locales
    assert "fr" in t.supported_locales


# ── Direct gettext / ngettext ────────────────────────────────────────


def test_passthrough_when_no_translator_configured() -> None:
    # Reset to ensure no translator
    reset_translator()
    assert gettext("Hello") == "Hello"


def test_gettext_translates_to_current_locale() -> None:
    configure_translator(_build_translator())
    bind_locale("es")
    assert gettext("Hello") == "Hola"
    assert gettext("Goodbye") == "Adiós"


def test_gettext_falls_back_to_default_for_unbound_locale() -> None:
    configure_translator(_build_translator())
    # No bind_locale call — uses default (en)
    assert gettext("Hello") == "Hello"


def test_gettext_falls_back_to_default_for_unsupported_locale() -> None:
    configure_translator(_build_translator())
    bind_locale("ja")  # unsupported
    assert gettext("Hello") == "Hello"


def test_gettext_returns_original_for_unknown_message() -> None:
    """No translation in catalog → return source string as-is."""
    configure_translator(_build_translator())
    bind_locale("fr")
    # 'fr' catalog has no 'Goodbye' entry — passthrough
    assert gettext("Goodbye") == "Goodbye"


def test_gettext_applies_substitutions() -> None:
    configure_translator(
        InMemoryTranslator(
            {"en": InMemoryCatalog("en", messages={"Hi {name}": "Hi {name}"})},
            default_locale="en",
        )
    )
    bind_locale("en")
    assert gettext("Hi {name}", name="Alice") == "Hi Alice"


# ── ngettext ─────────────────────────────────────────────────────────


def test_ngettext_chooses_singular_for_one() -> None:
    configure_translator(_build_translator())
    bind_locale("en")
    assert ngettext("{n} entry", "{n} entries", 1) == "1 entry"


def test_ngettext_chooses_plural_for_many() -> None:
    configure_translator(_build_translator())
    bind_locale("en")
    assert ngettext("{n} entry", "{n} entries", 7) == "7 entries"


def test_ngettext_localized_plurals() -> None:
    configure_translator(_build_translator())
    bind_locale("es")
    assert ngettext("{n} entry", "{n} entries", 1) == "1 entrada"
    assert ngettext("{n} entry", "{n} entries", 3) == "3 entradas"


def test_ngettext_falls_back_for_unknown_plural() -> None:
    """A plural pair not registered in the catalog returns the source
    singular/plural based on n."""
    configure_translator(_build_translator())
    bind_locale("en")
    result = ngettext("{n} unknown", "{n} unknowns", 5)
    assert result == "5 unknowns"


# ── Lazy variants ────────────────────────────────────────────────────


def test_gettext_lazy_resolves_at_str_time() -> None:
    """A LazyString captured before configure_translator must still
    translate correctly once the translator and locale are set."""
    lazy = gettext_lazy("Hello")
    configure_translator(_build_translator())
    bind_locale("es")
    assert str(lazy) == "Hola"


def test_gettext_lazy_picks_up_locale_changes() -> None:
    """Re-binding a different locale must affect the next read of the
    same LazyString instance."""
    configure_translator(_build_translator())
    lazy = gettext_lazy("Hello")
    bind_locale("en")
    assert str(lazy) == "Hello"
    bind_locale("es")
    assert str(lazy) == "Hola"


def test_lazy_string_equals_translated_str() -> None:
    configure_translator(_build_translator())
    bind_locale("es")
    lazy = gettext_lazy("Hello")
    assert lazy == "Hola"
    assert "Hola" == lazy  # both directions


def test_lazy_string_concatenation() -> None:
    configure_translator(_build_translator())
    bind_locale("es")
    lazy = gettext_lazy("Hello")
    assert lazy + ", world" == "Hola, world"
    assert "world, " + lazy == "world, Hola"


def test_lazy_string_is_unhashable() -> None:
    lazy = gettext_lazy("Hello")
    with pytest.raises(TypeError):
        hash(lazy)


def test_ngettext_lazy_resolves_with_n() -> None:
    configure_translator(_build_translator())
    bind_locale("en")
    lazy = ngettext_lazy("{n} entry", "{n} entries", 3)
    assert str(lazy) == "3 entries"


# ── get_translator ───────────────────────────────────────────────────


def test_get_translator_returns_passthrough_when_unconfigured() -> None:
    reset_translator()
    translator = get_translator()
    # The passthrough returns source strings unchanged
    assert translator.gettext("anything") == "anything"


def test_get_translator_returns_configured_translator() -> None:
    t = _build_translator()
    configure_translator(t)
    assert get_translator() is t
