"""Tests for catalog implementations."""

from __future__ import annotations

from theourgia.core.i18n.catalog import Catalog, InMemoryCatalog


def test_in_memory_catalog_satisfies_protocol() -> None:
    catalog: Catalog = InMemoryCatalog("en")
    assert catalog.locale == "en"


def test_empty_catalog_returns_source_message() -> None:
    catalog = InMemoryCatalog("en")
    assert catalog.gettext("Hello") == "Hello"


def test_catalog_returns_translation_when_present() -> None:
    catalog = InMemoryCatalog("es", messages={"Hello": "Hola"})
    assert catalog.gettext("Hello") == "Hola"


def test_catalog_returns_source_for_unknown_message() -> None:
    catalog = InMemoryCatalog("es", messages={"Hello": "Hola"})
    assert catalog.gettext("Goodbye") == "Goodbye"


def test_plural_one_uses_one_form() -> None:
    catalog = InMemoryCatalog(
        "en",
        plurals={
            ("$n entry", "$n entries"): {
                "one": "$n entry",
                "other": "$n entries",
            }
        },
    )
    assert catalog.ngettext("$n entry", "$n entries", 1) == "$n entry"


def test_plural_many_uses_other_form() -> None:
    catalog = InMemoryCatalog(
        "en",
        plurals={
            ("$n entry", "$n entries"): {
                "one": "$n entry",
                "other": "$n entries",
            }
        },
    )
    assert catalog.ngettext("$n entry", "$n entries", 5) == "$n entries"


def test_plural_falls_back_to_source_when_pair_missing() -> None:
    catalog = InMemoryCatalog("en")
    assert catalog.ngettext("apple", "apples", 1) == "apple"
    assert catalog.ngettext("apple", "apples", 3) == "apples"
