"""Unit tests for the saved-query DSL (B121).

Covers:
  * DSL_VERSION / SUBJECTS / COMPARATORS / AGGREGATES frozen catalogs
  * parse: round-trip every comparator + boolean combinator
  * validate: axis / value / aggregate semantic checks
  * StudyKind enum now has QUERY_BUILDER
  * /studies/{id}/run dispatch path for QUERY_BUILDER lives in
    test_studies.py once integration coverage lands; this module
    stays unit-level
"""

from __future__ import annotations

import pytest

from theourgia.core.analytics.query_dsl import (
    AGGREGATES,
    ALLOWED_FIELDS,
    COMPARATORS,
    DSL_VERSION,
    DSLValidationError,
    FieldNode,
    LogicalNode,
    NotNode,
    SUBJECTS,
    parse,
    validate,
    validate_field_against_subject,
)
from theourgia.models.studies import StudyKind


# ── Enum migration ─────────────────────────────────────────────


def test_study_kind_enum_now_includes_query_builder() -> None:
    assert "query_builder" in {k.value for k in StudyKind}


# ── Frozen catalogs ────────────────────────────────────────────


def test_dsl_version_is_one() -> None:
    assert DSL_VERSION == 1


def test_subjects_catalog() -> None:
    assert SUBJECTS == ("entry", "working", "synchronicity", "divination")


def test_comparators_catalog_has_eleven() -> None:
    assert len(COMPARATORS) == 11
    assert set(COMPARATORS) == {
        "eq", "ne", "lt", "le", "gt", "ge", "in", "nin",
        "contains", "matches", "between",
    }


def test_aggregates_catalog() -> None:
    assert set(AGGREGATES) == {"count", "mean", "sum", "histogram"}


def test_allowed_fields_covers_every_subject() -> None:
    """At least one axis per subject lives in the allowed-fields map."""
    for s in SUBJECTS:
        assert any(k.startswith(f"{s}.") for k in ALLOWED_FIELDS)


def test_allowed_fields_includes_cross_cutting_astro_and_calendar() -> None:
    assert "astro.moon_phase" in ALLOWED_FIELDS
    assert "calendar.season" in ALLOWED_FIELDS


# ── parse — happy paths ────────────────────────────────────────


def test_parse_minimal_query() -> None:
    q = parse({"version": 1, "subject": "entry", "filters": []})
    assert q.subject == "entry"
    assert q.filters == ()
    assert q.group_by is None


def test_parse_simple_field_filter() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {"field": "entry.entry_type", "cmp": "eq", "value": "working"}
            ],
        }
    )
    assert isinstance(q.filters[0], FieldNode)
    assert q.filters[0].field == "entry.entry_type"
    assert q.filters[0].cmp == "eq"
    assert q.filters[0].value == "working"


def test_parse_and_node() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "op": "and",
                    "children": [
                        {
                            "field": "entry.entry_type",
                            "cmp": "eq",
                            "value": "working",
                        },
                        {
                            "field": "entry.visibility",
                            "cmp": "eq",
                            "value": "personal",
                        },
                    ],
                }
            ],
        }
    )
    node = q.filters[0]
    assert isinstance(node, LogicalNode)
    assert node.op == "and"
    assert len(node.children) == 2


def test_parse_or_node() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "op": "or",
                    "children": [
                        {
                            "field": "synchronicity.category",
                            "cmp": "eq",
                            "value": "number_sequence",
                        },
                        {
                            "field": "synchronicity.category",
                            "cmp": "eq",
                            "value": "animal_omen",
                        },
                    ],
                }
            ],
        }
    )
    node = q.filters[0]
    assert isinstance(node, LogicalNode)
    assert node.op == "or"


def test_parse_not_node() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "op": "not",
                    "child": {
                        "field": "entry.entry_type",
                        "cmp": "eq",
                        "value": "draft",
                    },
                }
            ],
        }
    )
    node = q.filters[0]
    assert isinstance(node, NotNode)
    assert isinstance(node.child, FieldNode)
    assert node.child.value == "draft"


def test_parse_nested_logical_combinators() -> None:
    """NOT of OR of two ANDs — exercises arbitrary nesting."""
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "op": "not",
                    "child": {
                        "op": "or",
                        "children": [
                            {
                                "op": "and",
                                "children": [
                                    {
                                        "field": "synchronicity.intensity",
                                        "cmp": "ge",
                                        "value": 7,
                                    }
                                ],
                            },
                            {
                                "op": "and",
                                "children": [
                                    {
                                        "field": "synchronicity.category",
                                        "cmp": "eq",
                                        "value": "weather",
                                    }
                                ],
                            },
                        ],
                    },
                }
            ],
        }
    )
    outer = q.filters[0]
    assert isinstance(outer, NotNode)


def test_parse_full_query_with_aggregate_group_order() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "working",
            "filters": [
                {
                    "field": "working.outcome_rating",
                    "cmp": "ge",
                    "value": 7,
                }
            ],
            "group_by": ["astro.moon_phase"],
            "order_by": [{"field": "working.created_at", "dir": "desc"}],
            "limit": 25,
            "aggregate": "mean",
            "aggregate_axis": "working.outcome_rating",
        }
    )
    assert q.group_by == ("astro.moon_phase",)
    assert q.order_by is not None and q.order_by[0].field == "working.created_at"
    assert q.aggregate == "mean"
    assert q.aggregate_axis == "working.outcome_rating"
    assert q.limit == 25


# ── parse — rejections ─────────────────────────────────────────


def test_parse_rejects_unknown_version() -> None:
    with pytest.raises(DSLValidationError):
        parse({"version": 2, "subject": "entry", "filters": []})


def test_parse_rejects_unknown_subject() -> None:
    with pytest.raises(DSLValidationError):
        parse({"version": 1, "subject": "unknown", "filters": []})


def test_parse_rejects_unknown_comparator() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [
                    {"field": "entry.entry_type", "cmp": "===", "value": "x"}
                ],
            }
        )


def test_parse_rejects_unknown_logical_op() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [{"op": "xor", "children": []}],
            }
        )


def test_parse_rejects_empty_and_or() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [{"op": "and", "children": []}],
            }
        )


def test_parse_rejects_field_node_without_value() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [{"field": "entry.entry_type", "cmp": "eq"}],
            }
        )


def test_parse_rejects_extra_keys_on_logical_node() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [
                    {
                        "op": "and",
                        "children": [
                            {
                                "field": "entry.entry_type",
                                "cmp": "eq",
                                "value": "x",
                            }
                        ],
                        "wat": True,
                    }
                ],
            }
        )


def test_parse_rejects_extra_keys_on_field_node() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [
                    {
                        "field": "entry.entry_type",
                        "cmp": "eq",
                        "value": "x",
                        "wat": True,
                    }
                ],
            }
        )


def test_parse_rejects_bad_limit_type() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [],
                "limit": "twenty",
            }
        )


def test_parse_rejects_zero_limit() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [],
                "limit": 0,
            }
        )


def test_parse_rejects_unknown_aggregate() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [],
                "aggregate": "median",
            }
        )


def test_parse_rejects_bad_order_by_dir() -> None:
    with pytest.raises(DSLValidationError):
        parse(
            {
                "version": 1,
                "subject": "entry",
                "filters": [],
                "order_by": [{"field": "entry.created_at", "dir": "sideways"}],
            }
        )


# ── validate — happy + rejection ───────────────────────────────


def test_validate_passes_for_a_well_formed_query() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "synchronicity.intensity",
                    "cmp": "ge",
                    "value": 7,
                }
            ],
        }
    )
    validate(q)


def test_validate_rejects_unreachable_axis() -> None:
    """entry.body_text is not reachable from the synchronicity
    subject — the cross-subject join would be senseless."""
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "entry.body_text",
                    "cmp": "contains",
                    "value": "hekate",
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError) as exc:
        validate(q)
    assert "not reachable" in str(exc.value).lower()


def test_validate_allows_cross_cutting_astro_from_any_subject() -> None:
    for subject in SUBJECTS:
        q = parse(
            {
                "version": 1,
                "subject": subject,
                "filters": [
                    {
                        "field": "astro.moon_phase",
                        "cmp": "eq",
                        "value": "waning",
                    }
                ],
            }
        )
        validate(q)


def test_validate_rejects_number_value_on_string_axis() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "field": "entry.entry_type",
                    "cmp": "eq",
                    "value": 42,
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_rejects_string_on_numeric_axis() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "synchronicity.intensity",
                    "cmp": "ge",
                    "value": "high",
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_rejects_eq_on_id_list_axis() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "field": "entry.linked_entity_ids",
                    "cmp": "eq",
                    "value": "some-id",
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_accepts_contains_on_id_list() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "field": "entry.linked_entity_ids",
                    "cmp": "contains",
                    "value": "some-id",
                }
            ],
        }
    )
    validate(q)


def test_validate_rejects_between_with_one_value() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "synchronicity.intensity",
                    "cmp": "between",
                    "value": [5],
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_rejects_in_with_empty_list() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "synchronicity.category",
                    "cmp": "in",
                    "value": [],
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_mean_aggregate_requires_numeric_axis() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [],
            "aggregate": "mean",
            "aggregate_axis": "entry.entry_type",
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_mean_aggregate_accepts_numeric_axis() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "working",
            "filters": [],
            "aggregate": "mean",
            "aggregate_axis": "working.outcome_rating",
        }
    )
    validate(q)


def test_validate_rejects_aggregate_axis_without_aggregate() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [],
            "aggregate_axis": "entry.entry_type",
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_bool_axis_requires_boolean() -> None:
    q = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "field": "astro.has_aspect_to_natal",
                    "cmp": "eq",
                    "value": "true",
                }
            ],
        }
    )
    with pytest.raises(DSLValidationError):
        validate(q)


def test_validate_field_against_subject_rejects_unknown_axis() -> None:
    with pytest.raises(DSLValidationError):
        validate_field_against_subject("entry.fictional_axis", "entry")
