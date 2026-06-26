"""Unit tests for the ciphers router + bundled cipher catalog (B110).

Covers:
  * Bundled catalog invariants (≥ 13, unique slugs, every entry PD-cited).
  * Mapping parity with the H06-1 client cipher engine for the seven
    ciphers shipped client-side.
  * Pydantic schemas (Create / Update / Read).
  * Helper round-trips (_to_cipher_read, _is_bundled).
  * Router registration smoke + response models.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import ciphers as ciphers_module
from theourgia.api.routers.v1.ciphers import (
    BundledCipherRead,
    CipherCreate,
    CipherRead,
    CipherUpdate,
    _is_bundled,
    _to_cipher_read,
)
from theourgia.core.linguistic.bundled_ciphers import (
    BUNDLED_CIPHERS,
    BundledCipher,
    bundled_by_slug,
)
from theourgia.models.ciphers import CipherLanguage


_UNSET: object = object()


def _cipher_row(
    *,
    bundled_slug: str | None = None,
    owner_id: object = _UNSET,
    language: CipherLanguage = CipherLanguage.GREEK,
    source_citation: str | None = "Test citation",
    personal: bool = False,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4() if owner_id is _UNSET else owner_id,
        name="Test cipher",
        language=language,
        mapping={"α": 1, "β": 2},
        notes=None,
        source_citation=source_citation,
        personal=personal,
        bundled_slug=bundled_slug,
        created_at=now,
        updated_at=now,
    )


# ── Bundled catalog invariants ──────────────────────────────────────


def test_bundled_catalog_has_at_least_thirteen_entries() -> None:
    assert len(BUNDLED_CIPHERS) >= 13


def test_bundled_catalog_slugs_are_unique() -> None:
    slugs = [c.slug for c in BUNDLED_CIPHERS]
    assert len(slugs) == len(set(slugs))


def test_every_bundled_cipher_carries_pd_citation() -> None:
    """Honesty rule: no improvised cipher data. Every entry must
    cite a verifiable PD source."""
    for c in BUNDLED_CIPHERS:
        assert c.citation, f"bundled cipher {c.slug!r} has empty citation"
        assert len(c.citation) >= 10, (
            f"bundled cipher {c.slug!r} citation too short: {c.citation!r}"
        )


def test_every_bundled_cipher_uses_a_known_language() -> None:
    valid = {l.value for l in CipherLanguage if l != CipherLanguage.CUSTOM}
    for c in BUNDLED_CIPHERS:
        assert c.language in valid, (
            f"bundled cipher {c.slug!r} has invalid language: {c.language!r}"
        )


def test_every_bundled_cipher_has_nonempty_mapping() -> None:
    for c in BUNDLED_CIPHERS:
        assert c.mapping, f"bundled cipher {c.slug!r} has empty mapping"


def test_bundled_catalog_covers_six_languages() -> None:
    """The bundled corpus spans Greek, Hebrew, English, Coptic, Arabic,
    and Sanskrit. (Custom is reserved for personal ciphers.)"""
    languages = {c.language for c in BUNDLED_CIPHERS}
    assert {
        "greek", "hebrew", "english", "coptic", "arabic", "sanskrit",
    }.issubset(languages)


def test_bundled_by_slug_returns_match_or_none() -> None:
    assert bundled_by_slug("greek-iso") is not None
    assert bundled_by_slug("does-not-exist") is None


def test_bundled_cipher_is_immutable() -> None:
    c = BUNDLED_CIPHERS[0]
    assert isinstance(c, BundledCipher)
    with pytest.raises((AttributeError, Exception)):
        c.slug = "modified"  # frozen dataclass should raise


# ── Mapping parity with the H06-1 client engine ─────────────────────
#
# The seven client-shipped ciphers MUST have identical mappings on the
# server side. These tests encode the exact mappings the client engine
# produces (frontend/shared/src/gematria/ciphers.ts) and assert
# equality against the bundled server constants.


def test_greek_iso_mapping_parity() -> None:
    bundled = bundled_by_slug("greek-iso")
    assert bundled is not None
    expected = {
        "α": 1, "β": 2, "γ": 3, "δ": 4, "ε": 5, "ϛ": 6, "ϝ": 6,
        "ζ": 7, "η": 8, "θ": 9, "ι": 10, "κ": 20, "λ": 30, "μ": 40,
        "ν": 50, "ξ": 60, "ο": 70, "π": 80, "ϙ": 90, "ϟ": 90,
        "ρ": 100, "σ": 200, "ς": 200, "τ": 300, "υ": 400, "φ": 500,
        "χ": 600, "ψ": 700, "ω": 800, "ϡ": 900,
    }
    assert dict(bundled.mapping) == expected


def test_greek_ord_mapping_parity() -> None:
    bundled = bundled_by_slug("greek-ord")
    assert bundled is not None
    letters = "αβγδεζηθικλμνξοπρστυφχψω"
    expected = {ch: i + 1 for i, ch in enumerate(letters)}
    expected["ς"] = expected["σ"]
    assert dict(bundled.mapping) == expected


def test_heb_hechrachi_mapping_parity() -> None:
    bundled = bundled_by_slug("heb-hechrachi")
    assert bundled is not None
    expected = {
        "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7,
        "ח": 8, "ט": 9, "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40,
        "ם": 40, "נ": 50, "ן": 50, "ס": 60, "ע": 70, "פ": 80,
        "ף": 80, "צ": 90, "ץ": 90, "ק": 100, "ר": 200, "ש": 300,
        "ת": 400,
    }
    assert dict(bundled.mapping) == expected


def test_heb_siduri_mapping_parity() -> None:
    bundled = bundled_by_slug("heb-siduri")
    assert bundled is not None
    order = "אבגדהוזחטיכלמנסעפצקרשת"
    expected = {ch: i + 1 for i, ch in enumerate(order)}
    expected["ך"] = expected["כ"]
    expected["ם"] = expected["מ"]
    expected["ן"] = expected["נ"]
    expected["ף"] = expected["פ"]
    expected["ץ"] = expected["צ"]
    assert dict(bundled.mapping) == expected


def test_heb_atbash_mapping_parity() -> None:
    bundled = bundled_by_slug("heb-atbash")
    assert bundled is not None
    # Atbash: letter ↔ its mirror in the 22-letter sequence.
    hechrachi = dict(bundled_by_slug("heb-hechrachi").mapping)  # type: ignore
    order = list("אבגדהוזחטיכלמנסעפצקרשת")
    expected: dict[str, int] = {}
    for i, ch in enumerate(order):
        partner = order[len(order) - 1 - i]
        expected[ch] = hechrachi[partner]
    expected["ך"] = expected["כ"]
    expected["ם"] = expected["מ"]
    expected["ן"] = expected["נ"]
    expected["ף"] = expected["פ"]
    expected["ץ"] = expected["צ"]
    assert dict(bundled.mapping) == expected


def test_eng_simple_mapping_parity() -> None:
    bundled = bundled_by_slug("eng-simple")
    assert bundled is not None
    expected = {chr(ord("a") + i): i + 1 for i in range(26)}
    assert dict(bundled.mapping) == expected


def test_copt_iso_mapping_parity() -> None:
    bundled = bundled_by_slug("copt-iso")
    assert bundled is not None
    expected = {
        "ⲁ": 1, "ⲃ": 2, "ⲅ": 3, "ⲇ": 4, "ⲉ": 5, "ⲋ": 6, "ⲍ": 7,
        "ⲏ": 8, "ⲑ": 9, "ⲓ": 10, "ⲕ": 20, "ⲗ": 30, "ⲙ": 40, "ⲛ": 50,
        "ⲝ": 60, "ⲟ": 70, "ⲡ": 80, "ϥ": 90, "ⲣ": 100, "ⲥ": 200,
        "ⲧ": 300, "ⲩ": 400, "ⲫ": 500, "ⲭ": 600, "ⲯ": 700, "ⲱ": 800,
        "ϣ": 900, "ϫ": 90,
    }
    assert dict(bundled.mapping) == expected


# ── Schema validation ──────────────────────────────────────────────


def test_cipher_create_minimal_payload_validates() -> None:
    p = CipherCreate(
        name="Personal cipher",
        language=CipherLanguage.GREEK,
        mapping={"α": 1},
    )
    assert p.name == "Personal cipher"
    assert p.source_citation is None


def test_cipher_create_with_citation_validates() -> None:
    p = CipherCreate(
        name="Custom shared cipher",
        language=CipherLanguage.HEBREW,
        mapping={"א": 1},
        source_citation="Author 2024 — fictional source.",
    )
    assert p.source_citation == "Author 2024 — fictional source."


def test_cipher_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        CipherCreate(name="", language=CipherLanguage.GREEK, mapping={})


def test_cipher_create_rejects_invalid_language() -> None:
    with pytest.raises(ValidationError):
        CipherCreate(name="X", language="klingon", mapping={})  # type: ignore


def test_cipher_create_accepts_all_seven_languages() -> None:
    for lang in CipherLanguage:
        p = CipherCreate(
            name=f"Cipher in {lang.value}",
            language=lang,
            mapping={},
        )
        assert p.language == lang


def test_cipher_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CipherCreate(
            name="X",
            language=CipherLanguage.GREEK,
            mapping={},
            bundled_slug="forbidden",  # type: ignore[call-arg]
        )


def test_cipher_update_is_fully_optional() -> None:
    p = CipherUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_cipher_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CipherUpdate(personal=True)  # type: ignore[call-arg]


def test_cipher_update_can_clear_citation_for_personalisation() -> None:
    """Patching source_citation to empty is allowed — the API flips
    personal=True. The schema accepts an empty string."""
    p = CipherUpdate(source_citation="")
    assert p.model_dump(exclude_unset=True) == {"source_citation": ""}


# ── Helpers ──────────────────────────────────────────────────────────


def test_to_cipher_read_serialises_enum_and_uuid() -> None:
    row = _cipher_row(bundled_slug=None)
    read = _to_cipher_read(row)
    assert read.id == str(row.id)
    assert read.language == "greek"
    assert read.bundled_slug is None
    assert read.owner_id == str(row.owner_id)


def test_to_cipher_read_bundled_has_no_owner() -> None:
    row = _cipher_row(bundled_slug="greek-iso", owner_id=None)
    read = _to_cipher_read(row)
    assert read.owner_id is None
    assert read.bundled_slug == "greek-iso"


def test_is_bundled_only_true_for_slug_plus_null_owner() -> None:
    assert _is_bundled(_cipher_row(bundled_slug="greek-iso", owner_id=None))
    # Slug present but with an owner = a forked personal copy.
    assert not _is_bundled(_cipher_row(bundled_slug="greek-iso"))
    # No slug, no owner = legacy / orphan; not bundled.
    assert not _is_bundled(_cipher_row(bundled_slug=None, owner_id=None))
    # No slug + owner = personal.
    assert not _is_bundled(_cipher_row(bundled_slug=None))


# ── Router smoke ──────────────────────────────────────────────────


def test_ciphers_router_registers_six_routes() -> None:
    paths_methods = {
        (r.path, m) for r in ciphers_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/ciphers/bundled", "GET"),
        ("/ciphers", "GET"),
        ("/ciphers", "POST"),
        ("/ciphers/{cipher_id}", "GET"),
        ("/ciphers/{cipher_id}", "PATCH"),
        ("/ciphers/{cipher_id}", "DELETE"),
    }
    assert expected.issubset(paths_methods)


def test_ciphers_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in ciphers_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert (
        by_key[("/ciphers/bundled", "GET")] == list[BundledCipherRead]
    )
    assert by_key[("/ciphers", "GET")] == list[CipherRead]
    assert by_key[("/ciphers", "POST")] == CipherRead
    assert by_key[("/ciphers/{cipher_id}", "GET")] == CipherRead
    assert by_key[("/ciphers/{cipher_id}", "PATCH")] == CipherRead


def test_every_bundled_cipher_round_trips_through_the_read_schema() -> None:
    """A defensive parity test: every bundled fixture deserialises
    cleanly through BundledCipherRead so the API never crashes on
    a malformed fixture."""
    for c in BUNDLED_CIPHERS:
        read = BundledCipherRead(
            slug=c.slug,
            name=c.name,
            language=c.language,
            citation=c.citation,
            mapping=dict(c.mapping),
        )
        assert read.slug == c.slug
        assert read.citation == c.citation
