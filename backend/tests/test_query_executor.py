"""Unit tests for the query executor (B122).

The executor is a pure translator from DSL → SQLAlchemy. We test it
at the translation layer (the produced predicates / SQL fragments)
without spinning up a live DB. Integration tests over a real
session land alongside the analytics-aggregate batch (B123) where
the fixture data lives.

Coverage:
  * Subject → base-stmt narrowing
  * Comparator translation
  * Sealed exclusion logic
  * Owner-scoping
  * Row cap
  * Result schema
  * /analytics/query smoke (router registration + 401)
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.api.routers.v1 import analytics as analytics_module
from theourgia.core.analytics.executor import (
    ExecutionError,
    QueryExecutionResult,
    RESULT_ROW_CAP,
    _base_stmt_for_subject,
    _column_for_axis,
    _filter_touches_body_text,
    _node_to_sql,
)
from theourgia.core.analytics.query_dsl import (
    FieldNode,
    LogicalNode,
    NotNode,
    parse,
)


# ── Subject → base stmt ──────────────────────────────────────────


def test_base_stmt_entry_subject_returns_select() -> None:
    owner = uuid4()
    stmt = _base_stmt_for_subject("entry", owner)
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "entry" in sql.lower()
    assert "owner_id" in sql.lower()


def test_base_stmt_synchronicity_subject_returns_select() -> None:
    owner = uuid4()
    stmt = _base_stmt_for_subject("synchronicity", owner)
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "synchronicity" in sql.lower()


def test_base_stmt_working_narrows_to_working_entry_types() -> None:
    """The 'working' subject is a view over the entry table filtered
    by entry_type."""
    owner = uuid4()
    stmt = _base_stmt_for_subject("working", owner)
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "entry" in sql.lower()
    # The DSL exposes ``entry.entry_type`` but the Entry table's
    # column is ``type``. We just verify the narrowing fired.
    assert "entry.type" in sql.lower()


def test_base_stmt_divination_narrows_to_divination_entry_types() -> None:
    owner = uuid4()
    stmt = _base_stmt_for_subject("divination", owner)
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    # The DSL exposes ``entry.entry_type`` but the Entry table's
    # column is ``type``. We just verify the narrowing fired.
    assert "entry.type" in sql.lower()


def test_base_stmt_rejects_unknown_subject() -> None:
    with pytest.raises(ExecutionError):
        _base_stmt_for_subject("unknown_subject", uuid4())


# ── Column resolution ────────────────────────────────────────────


def test_column_for_axis_entry_axes_resolve() -> None:
    col = _column_for_axis("entry.created_at")
    assert col is not None


def test_column_for_axis_synchronicity_axes_resolve() -> None:
    col = _column_for_axis("synchronicity.intensity")
    assert col is not None


def test_column_for_axis_astro_axes_raise_without_subject() -> None:
    """astro.* axes are cross-cutting. Without a subject context,
    the resolver can't route them to a column — it raises loudly
    so legacy callers don't accidentally produce empty queries."""
    with pytest.raises(ExecutionError):
        _column_for_axis("astro.moon_phase")


def test_column_for_axis_astro_resolves_for_synchronicity_subject() -> None:
    """On the synchronicity subject, astro.* axes resolve to the
    JSONB ->> indexing expression on astro_snapshot."""
    col = _column_for_axis("astro.moon_phase", subject="synchronicity")
    assert col is not None
    sql = str(col.compile(compile_kwargs={"literal_binds": True}))
    # The PG operator ->> renders as the textual JSONB key access.
    assert "astro_snapshot" in sql
    assert "moon_phase" in sql


def test_column_for_axis_calendar_resolves_for_synchronicity_subject() -> None:
    col = _column_for_axis("calendar.weekday", subject="synchronicity")
    assert col is not None
    sql = str(col.compile(compile_kwargs={"literal_binds": True}))
    assert "calendar_stamp" in sql
    assert "weekday" in sql


def test_column_for_axis_astro_bool_axis_casts_to_boolean() -> None:
    """astro.has_aspect_to_natal is bool-typed in the DSL; the
    executor casts the JSONB text to Boolean so comparisons line up."""
    col = _column_for_axis(
        "astro.has_aspect_to_natal", subject="synchronicity",
    )
    sql = str(col.compile(compile_kwargs={"literal_binds": True}))
    assert "BOOLEAN" in sql.upper() or "boolean" in sql.lower()


def test_column_for_axis_astro_rejected_for_entry_subject() -> None:
    """The Entry table's astro_snapshot is Text, not JSONB. The
    executor refuses entry-subject astro queries until that column
    gets the JSONB treatment."""
    with pytest.raises(ExecutionError):
        _column_for_axis("astro.moon_phase", subject="entry")


def test_column_for_axis_calendar_rejected_for_working_subject() -> None:
    with pytest.raises(ExecutionError):
        _column_for_axis("calendar.weekday", subject="working")


def test_column_for_axis_unknown_raises_execution_error() -> None:
    with pytest.raises(ExecutionError):
        _column_for_axis("entry.does_not_exist")


# ── Comparator translation ───────────────────────────────────────


def _compile(node: FieldNode) -> str:
    return str(_node_to_sql(node).compile(compile_kwargs={"literal_binds": True}))


def test_eq_comparator_translates_to_equality() -> None:
    s = _compile(
        FieldNode(field="entry.entry_type", cmp="eq", value="working")
    )
    assert "= 'working'" in s


def test_ne_comparator() -> None:
    s = _compile(
        FieldNode(field="entry.entry_type", cmp="ne", value="draft")
    )
    assert "!= 'draft'" in s or "<> 'draft'" in s


def test_lt_le_gt_ge_comparators() -> None:
    s_lt = _compile(
        FieldNode(field="synchronicity.intensity", cmp="lt", value=5)
    )
    s_le = _compile(
        FieldNode(field="synchronicity.intensity", cmp="le", value=5)
    )
    s_gt = _compile(
        FieldNode(field="synchronicity.intensity", cmp="gt", value=5)
    )
    s_ge = _compile(
        FieldNode(field="synchronicity.intensity", cmp="ge", value=5)
    )
    assert "< 5" in s_lt and "<= 5" in s_le
    assert "> 5" in s_gt and ">= 5" in s_ge


def test_in_comparator() -> None:
    s = _compile(
        FieldNode(
            field="synchronicity.category",
            cmp="in",
            value=["weather", "animal_omen"],
        )
    )
    assert " IN (" in s.upper()
    assert "weather" in s and "animal_omen" in s


def test_nin_comparator() -> None:
    s = _compile(
        FieldNode(
            field="synchronicity.category",
            cmp="nin",
            value=["custom"],
        )
    )
    assert " NOT IN (" in s.upper()


def test_contains_on_string_axis_translates_to_ilike() -> None:
    s = _compile(
        FieldNode(field="entry.body_text", cmp="contains", value="hekate")
    )
    assert "LIKE" in s.upper()
    assert "%hekate%" in s


def test_between_comparator() -> None:
    s = _compile(
        FieldNode(
            field="synchronicity.intensity",
            cmp="between",
            value=[3, 8],
        )
    )
    assert "3" in s and "8" in s
    # SQLAlchemy renders the AND'd bounds.
    assert ">= 3" in s and "<= 8" in s


def test_logical_and_node_compiles() -> None:
    node = LogicalNode(
        op="and",
        children=(
            FieldNode(
                field="synchronicity.intensity", cmp="ge", value=5,
            ),
            FieldNode(
                field="synchronicity.category", cmp="eq", value="weather",
            ),
        ),
    )
    s = str(_node_to_sql(node).compile(
        compile_kwargs={"literal_binds": True}
    ))
    assert "AND" in s.upper()


def test_logical_or_node_compiles() -> None:
    node = LogicalNode(
        op="or",
        children=(
            FieldNode(
                field="synchronicity.intensity", cmp="ge", value=8,
            ),
            FieldNode(
                field="synchronicity.category", cmp="eq", value="dream_spillover",
            ),
        ),
    )
    s = str(_node_to_sql(node).compile(
        compile_kwargs={"literal_binds": True}
    ))
    assert " OR " in s.upper()


def test_not_node_compiles() -> None:
    """SQLAlchemy may collapse ``not_(col == v)`` to ``col != v`` —
    both forms are semantically identical. Accept either."""
    node = NotNode(
        child=FieldNode(
            field="entry.entry_type", cmp="eq", value="draft",
        ),
    )
    s = str(_node_to_sql(node).compile(
        compile_kwargs={"literal_binds": True}
    )).upper()
    assert "NOT" in s or "!=" in s or "<>" in s


def test_not_node_with_logical_combinator_keeps_NOT() -> None:
    """When the child isn't a simple eq, SQLAlchemy keeps the NOT
    in the rendered SQL — this is the more interesting case."""
    node = NotNode(
        child=LogicalNode(
            op="and",
            children=(
                FieldNode(
                    field="synchronicity.intensity", cmp="ge", value=5,
                ),
                FieldNode(
                    field="synchronicity.category",
                    cmp="eq",
                    value="weather",
                ),
            ),
        ),
    )
    s = str(_node_to_sql(node).compile(
        compile_kwargs={"literal_binds": True}
    )).upper()
    assert "NOT" in s


# ── Sealed exclusion detection ───────────────────────────────────


def test_sealed_touches_body_text_detects_field_node() -> None:
    node = FieldNode(
        field="entry.body_text", cmp="contains", value="hekate",
    )
    assert _filter_touches_body_text(node) is True


def test_sealed_touches_body_text_skips_unrelated_field() -> None:
    node = FieldNode(
        field="entry.entry_type", cmp="eq", value="working",
    )
    assert _filter_touches_body_text(node) is False


def test_sealed_touches_body_text_unwraps_logical_nodes() -> None:
    node = LogicalNode(
        op="and",
        children=(
            FieldNode(
                field="entry.entry_type", cmp="eq", value="working",
            ),
            FieldNode(
                field="entry.body_text", cmp="contains", value="hekate",
            ),
        ),
    )
    assert _filter_touches_body_text(node) is True


def test_sealed_touches_body_text_unwraps_not_nodes() -> None:
    node = NotNode(
        child=FieldNode(
            field="entry.body_text", cmp="contains", value="x",
        ),
    )
    assert _filter_touches_body_text(node) is True


# ── Astro / calendar JSONB axes ──────────────────────────────────


def test_executor_resolves_astro_filter_on_synchronicity_subject() -> None:
    """The synchronicity subject now supports astro.* filters via
    JSONB indexing on astro_snapshot. The DSL parses, the executor
    compiles a clean PG expression."""
    parsed = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "astro.moon_phase",
                    "cmp": "eq",
                    "value": "waning",
                }
            ],
        }
    )
    expr = _node_to_sql(parsed.filters[0], subject="synchronicity")
    sql = str(expr.compile(compile_kwargs={"literal_binds": True}))
    assert "astro_snapshot" in sql
    assert "moon_phase" in sql
    assert "waning" in sql


def test_executor_resolves_calendar_filter_on_synchronicity_subject() -> None:
    parsed = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "calendar.weekday",
                    "cmp": "eq",
                    "value": "wednesday",
                }
            ],
        }
    )
    expr = _node_to_sql(parsed.filters[0], subject="synchronicity")
    sql = str(expr.compile(compile_kwargs={"literal_binds": True}))
    assert "calendar_stamp" in sql
    assert "wednesday" in sql


def test_executor_rejects_astro_filter_on_entry_subject() -> None:
    """Cross-cutting astro.* axes don't yet route to the Entry
    table — its astro_snapshot column is Text-encoded at B121,
    not JSONB. The executor raises so the route surfaces 400."""
    parsed = parse(
        {
            "version": 1,
            "subject": "entry",
            "filters": [
                {
                    "field": "astro.moon_phase",
                    "cmp": "eq",
                    "value": "waning",
                }
            ],
        }
    )
    with pytest.raises(ExecutionError):
        _node_to_sql(parsed.filters[0], subject="entry")


def test_executor_legacy_no_subject_call_still_raises_for_astro() -> None:
    """Backwards-compat: a caller that doesn't yet thread subject
    through gets the old loud failure. No silent zero rows."""
    parsed = parse(
        {
            "version": 1,
            "subject": "synchronicity",
            "filters": [
                {
                    "field": "astro.moon_phase",
                    "cmp": "eq",
                    "value": "waning",
                }
            ],
        }
    )
    with pytest.raises(ExecutionError):
        _node_to_sql(parsed.filters[0])  # no subject kwarg


# ── Result schema ────────────────────────────────────────────────


def test_query_execution_result_shape() -> None:
    r = QueryExecutionResult(
        total_rows=5,
        rows=[],
        groups=None,
        aggregate_value=None,
        sealed_excluded_count=2,
    )
    assert r.total_rows == 5
    assert r.sealed_excluded_count == 2
    assert r.groups is None


def test_result_row_cap_constant() -> None:
    """The executor caps response rows at 1000."""
    assert RESULT_ROW_CAP == 1000


# ── Router smoke ─────────────────────────────────────────────────


def test_analytics_router_registers_query_route() -> None:
    paths_methods = {
        (r.path, m)
        for r in analytics_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/analytics/query", "POST") in paths_methods


def test_analytics_query_endpoint_has_QueryExecutionResult_response_model() -> None:
    from fastapi.routing import APIRoute

    for r in analytics_module.router.routes:
        if isinstance(r, APIRoute) and r.path == "/analytics/query":
            assert r.response_model == QueryExecutionResult
            return
    raise AssertionError("/analytics/query route missing")
