"""Template substrate tests.

Pure-Python tests of the model + built-in templates + Pydantic
schemas. DB-integration via real Postgres in the deploy round-trip.
"""

from __future__ import annotations

import json

from theourgia.core.templates import BUILTIN_TEMPLATES, builtin_by_id
from theourgia.models.entries import EntryType
from theourgia.models.templates import EntryTemplate, TemplateScope


# ───── Built-in templates ───────────────────────────────────────────────


def test_twelve_builtin_templates_ship() -> None:
    """`plan/04-journaling.md` §3 requires the 12 built-in templates."""
    assert len(BUILTIN_TEMPLATES) == 12


def test_every_builtin_has_a_stable_id_and_name() -> None:
    ids = {t.builtin_id for t in BUILTIN_TEMPLATES}
    names = {t.name for t in BUILTIN_TEMPLATES}
    assert len(ids) == 12  # all distinct
    assert len(names) == 12  # all distinct


def test_every_builtin_has_valid_tiptap_json_body() -> None:
    """body_template must parse as JSON and be a Tiptap doc."""
    for t in BUILTIN_TEMPLATES:
        doc = json.loads(t.body_template)
        assert doc["type"] == "doc"
        assert isinstance(doc["content"], list)
        assert doc["content"], f"{t.builtin_id} has empty content"


def test_every_builtin_has_a_default_title_pattern_and_glyph() -> None:
    for t in BUILTIN_TEMPLATES:
        assert t.default_title_pattern, f"{t.builtin_id} missing default_title_pattern"
        assert t.default_glyph, f"{t.builtin_id} missing default_glyph"


def test_every_builtin_kind_is_a_valid_entry_type() -> None:
    for t in BUILTIN_TEMPLATES:
        assert isinstance(t.kind, EntryType)


def test_builtin_by_id_lookup() -> None:
    assert builtin_by_id("magical-record").name.startswith("Magical Record")
    assert builtin_by_id("liber-resh").kind == EntryType.LIBER_RESH
    assert builtin_by_id("tarot-reading").kind == EntryType.DIVINATION


def test_builtin_by_id_unknown_raises() -> None:
    import pytest
    with pytest.raises(KeyError):
        builtin_by_id("not-a-real-template")


def test_expected_builtin_set() -> None:
    """The exact 12 documented in `plan/04-journaling.md` §3."""
    expected = {
        "magical-record", "ritual-log", "dream", "divination",
        "synchronicity", "liber-resh", "banishing", "invocation",
        "scrying", "tarot-reading", "pathworking", "astrology-reading",
    }
    actual = {t.builtin_id for t in BUILTIN_TEMPLATES}
    assert actual == expected


# ───── Pydantic API schemas ─────────────────────────────────────────────


def test_template_create_minimal_payload_validates() -> None:
    from theourgia.api.routers.v1.templates import TemplateCreate

    payload = TemplateCreate(
        name="Quiet evening reflection",
        kind="note",
        body_template='{"type":"doc","content":[]}',
    )
    assert payload.scope == "personal"
    assert payload.default_glyph == "feather"


def test_template_create_rejects_empty_name() -> None:
    from pydantic import ValidationError
    import pytest

    from theourgia.api.routers.v1.templates import TemplateCreate

    with pytest.raises(ValidationError):
        TemplateCreate(
            name="",
            kind="note",
            body_template='{"type":"doc"}',
        )


def test_template_create_rejects_unknown_kind() -> None:
    from pydantic import ValidationError
    import pytest

    from theourgia.api.routers.v1.templates import TemplateCreate

    with pytest.raises(ValidationError):
        TemplateCreate(
            name="Bogus",
            kind="klingon",  # type: ignore[arg-type]
            body_template='{"type":"doc"}',
        )


def test_template_scope_enum_values() -> None:
    assert {s.value for s in TemplateScope} == {
        "personal", "vault_shared", "publishable",
    }


def test_templates_router_registered() -> None:
    from theourgia.api.routers.v1.templates import router

    paths = {route.path for route in router.routes}
    assert "/templates" in paths
    assert "/templates/{template_id}" in paths
