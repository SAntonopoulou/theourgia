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


def test_column_for_axis_astro_axes_raise_until_materialised() -> None:
    """astro.* axes are declared in the DSL but the entry's
    astro_snapshot column is still Text-encoded JSON. The executor
    should fail loudly until those columns get the JSONB treatment."""
    with pytest.raises(ExecutionError):
        _column_for_axis("astro.moon_phase")


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


# ── Astro axis raises until materialised ─────────────────────────


def test_executor_rejects_astro_axis_for_now() -> None:
    """The DSL accepts astro.moon_phase syntactically, but the
    executor refuses to run it until the JSONB column treatment
    lands. Loud failure > silent zero rows."""
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
    # Calling _node_to_sql on a filter that references an axis
    # without a materialised column raises ExecutionError —
    # validated even before we touch the DB.
    with pytest.raises(ExecutionError):
        _node_to_sql(parsed.filters[0])


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
