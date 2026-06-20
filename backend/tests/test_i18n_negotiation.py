"""Tests for Accept-Language parsing and locale negotiation."""

from __future__ import annotations

import pytest

from theourgia.core.i18n.negotiation import (
    negotiate_locale,
    parse_accept_language,
)


# ── parse_accept_language ────────────────────────────────────────────


def test_parse_empty_header_returns_empty_list() -> None:
    assert parse_accept_language("") == []


def test_parse_single_locale() -> None:
    assert parse_accept_language("en") == [("en", 1.0)]


def test_parse_multi_locale_with_quality() -> None:
    result = parse_accept_language("en-US,en;q=0.9,fr;q=0.7")
    assert result == [("en-us", 1.0), ("en", 0.9), ("fr", 0.7)]


def test_parse_sorts_by_quality_descending() -> None:
    result = parse_accept_language("fr;q=0.5,en;q=0.9,de;q=0.7")
    assert [locale for locale, _q in result] == ["en", "de", "fr"]


def test_parse_normalizes_case() -> None:
    assert parse_accept_language("EN-US") == [("en-us", 1.0)]


def test_parse_skips_empty_tokens() -> None:
    # Trailing comma / spurious whitespace
    assert parse_accept_language("en,,, fr") == [("en", 1.0), ("fr", 1.0)]


def test_parse_handles_malformed_quality_gracefully() -> None:
    # "q=garbage" should default to 0.0 (lowest priority) and not raise
    result = parse_accept_language("en,fr;q=garbage")
    assert ("en", 1.0) in result
    assert ("fr", 0.0) in result


def test_parse_rejects_out_of_range_quality() -> None:
    result = parse_accept_language("en;q=2.0,fr;q=1.0")
    assert result == [("fr", 1.0)]


def test_parse_handles_whitespace_around_separators() -> None:
    assert parse_accept_language(" en , fr ; q = 0.5") == [
        ("en", 1.0),
        ("fr", 0.5),
    ]


# ── negotiate_locale ─────────────────────────────────────────────────


def test_negotiate_returns_default_when_supported_empty() -> None:
    assert negotiate_locale("en", [], "en") == "en"


def test_negotiate_returns_default_when_no_match() -> None:
    assert negotiate_locale("fr,de", ["en", "es"], "en") == "en"


def test_negotiate_exact_match() -> None:
    assert negotiate_locale("en", ["en", "es"], "en") == "en"


def test_negotiate_picks_highest_quality_supported() -> None:
    # fr is the user's top pick but unsupported; en is q=0.5
    assert negotiate_locale(
        "fr;q=1.0,en;q=0.5", ["en", "es"], "es"
    ) == "en"


def test_negotiate_prefix_match() -> None:
    # User asked for en-US; we support 'en' — match on language prefix
    assert negotiate_locale("en-US", ["en", "es"], "es") == "en"


def test_negotiate_preserves_supported_case() -> None:
    # Header is lowercased internally, but the returned value is the
    # original from the supported list (preserving the canonical case).
    assert negotiate_locale("pt-br", ["en", "pt-BR"], "en") == "pt-BR"


def test_negotiate_empty_accept_returns_default() -> None:
    assert negotiate_locale("", ["en", "es"], "en") == "en"


@pytest.mark.parametrize(
    ("accept", "expected"),
    [
        ("es,en;q=0.5", "es"),
        ("ja;q=0.9,en;q=0.1", "en"),  # ja unsupported, fall through to en
        ("fr-CA,en-US;q=0.8", "en"),  # both lookups via prefix
    ],
)
def test_negotiate_realistic_headers(accept: str, expected: str) -> None:
    assert negotiate_locale(accept, ["en", "es", "pt-BR"], "en") == expected
