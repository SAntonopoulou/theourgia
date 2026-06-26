"""Query executor (B122).

Per ``plan/09-batches-backend.md`` § B122.

Translates a parsed DSL query (B121) into a SQLAlchemy ``select()``
across the indicated subject table, applies the filters, group-by,
order-by, and aggregate, then runs the query against the caller's
vault.

Subject → table mapping:

  entry           → entry table (any kind)
  working         → entry table with entry_type IN (the working subset)
  divination      → entry table with entry_type IN (the divination subset)
  synchronicity   → synchronicity table

Honesty rules wired (mirror the B111 + B112 invariants):

  * Sealed entries' body text NEVER enters a result. The executor
    adds ``Entry.encryption_mode != SEALED`` to ANY query that has
    a filter on ``entry.body_text``. Other entry-axis filters
    (created_at, entry_type) DO match sealed rows — the protection
    is on the content, not the shape.
  * The ``sealed_excluded_count`` indicator on the response surfaces
    the count of sealed entries that WOULD have matched the query
    if not for the body-text protection. Never leaks the body text
    itself.
  * Owner-scoping is server-side. Every subject table has an
    owner_id column; the executor pins it to the caller's id.
  * Result cap: 1000 rows per response (pagination via limit + offset
    for larger result sets). The DSL ``limit`` is honoured when
    smaller than the cap.
  * Timeout: B122 doesn't yet wire a soft cap — that's a follow-up.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    and_,
    cast,
    func,
    not_,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.analytics.query_dsl import (
    ALLOWED_FIELDS,
    DSLValidationError,
    FieldNode,
    FilterNode,
    LogicalNode,
    NotNode,
    ParsedQuery,
    validate as dsl_validate,
)
from theourgia.models.entries import EncryptionMode, Entry, EntryType
from theourgia.models.synchronicities import Synchronicity

__all__ = [
    "ExecutionError",
    "QueryExecutionResult",
    "RESULT_ROW_CAP",
    "execute_query",
]


RESULT_ROW_CAP = 1000


# ── Result shape ─────────────────────────────────────────────────


class GroupRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    group_key: Any
    count: int


class QueryExecutionResult(BaseModel):
    """Mirrors the plan's contract."""

    model_config = ConfigDict(extra="forbid")

    total_rows: int
    rows: list[dict]
    groups: list[GroupRow] | None
    aggregate_value: float | None
    sealed_excluded_count: int


class ExecutionError(Exception):
    """Raised when an otherwise-validated query can't be executed
    against the current schema (e.g., a planned axis that hasn't
    been materialised yet). The route converts it to 400."""


# ── Subject → table + entry_type narrowing ──────────────────────


# Phase 04 EntryTypes that count as a "working" for analytics. Per
# the H06 design request the practitioner can refine this; the
# defaults err on the inclusive side.
_WORKING_ENTRY_TYPES: tuple[str, ...] = (
    EntryType.WORKING.value if hasattr(EntryType, "WORKING") else "working",
)
_DIVINATION_ENTRY_TYPES: tuple[str, ...] = (
    EntryType.DIVINATION.value
    if hasattr(EntryType, "DIVINATION")
    else "divination",
)


def _entry_type_values(names: tuple[str, ...]) -> list[str]:
    """Return EntryType enum values that correspond to ``names``,
    falling back to the literal string when the enum doesn't declare
    it (defensive — keeps the executor stable across schema drift)."""
    values: list[str] = []
    for n in names:
        try:
            values.append(EntryType(n).value)
        except ValueError:
            values.append(n)
    return values


# ── Axis → column mapping ───────────────────────────────────────


# Map of axes the executor knows how to translate into SQL today.
# Axes that ship in the DSL but have no concrete column yet raise
# ExecutionError on use (the route returns 400 with a clear message).

# Note: ``entry.captured_at`` is declared in the DSL but the Entry
# table uses ``occurred_at`` instead. We point ``entry.captured_at``
# at ``occurred_at`` for now and treat the name as a synonym in the
# executor; the DSL will rename in a follow-up that doesn't require
# a schema migration.
#
# The Entry table's ``entry_type`` Python attribute maps to the SQL
# column literally named ``type``. We reach it via the model class
# attribute (which SQLAlchemy resolves correctly).
_ENTRY_AXES: dict[str, Column] = {
    "entry.created_at": Entry.__table__.c.created_at,
    "entry.captured_at": Entry.__table__.c.occurred_at,
    "entry.entry_type": Entry.__table__.c.type,
    "entry.body_text": Entry.__table__.c.body_text,
    "entry.encryption_mode": Entry.__table__.c.encryption_mode,
    "entry.visibility": Entry.__table__.c.visibility,
}

_SYNCHRONICITY_AXES: dict[str, Column] = {
    "synchronicity.occurred_at": Synchronicity.__table__.c.occurred_at,
    "synchronicity.category": Synchronicity.__table__.c.category,
    "synchronicity.intensity": Synchronicity.__table__.c.intensity,
}


# JSONB-axis paths. The DSL declares ``astro.*`` and ``calendar.*`` as
# cross-cutting axes. On the Synchronicity table these live as JSONB
# columns ``astro_snapshot`` and ``calendar_stamp``. Each axis maps
# its dotted suffix to the JSONB key + the SQL type the value should
# cast to.
_JSONB_AXIS_PATHS: dict[str, tuple[str, str]] = {
    # astro.* → key inside astro_snapshot
    "astro.moon_phase": ("astro_snapshot", "moon_phase"),
    "astro.planetary_hour": ("astro_snapshot", "planetary_hour"),
    "astro.sun_sign": ("astro_snapshot", "sun_sign"),
    "astro.moon_sign": ("astro_snapshot", "moon_sign"),
    "astro.has_aspect_to_natal": ("astro_snapshot", "has_aspect_to_natal"),
    # calendar.* → key inside calendar_stamp
    "calendar.season": ("calendar_stamp", "season"),
    "calendar.festival": ("calendar_stamp", "festival"),
    "calendar.weekday": ("calendar_stamp", "weekday"),
}


def _jsonb_axis_expression(axis: str):
    """Compile a JSONB-path axis into a SQLAlchemy expression on the
    Synchronicity table.

    The DSL axis type drives the cast:
      * string → ``.astext`` (Text column)
      * bool   → cast(.astext, Boolean)
      * int    → cast(.astext, Integer)

    Other subjects (entry / working / divination) raise — their
    astro/calendar columns are Text-encoded (B121), not JSONB."""
    column_name, key = _JSONB_AXIS_PATHS[axis]
    sa_col = Synchronicity.__table__.c[column_name]
    expr = sa_col[key].astext
    # Type-cast the JSON text based on the DSL declaration.
    axis_type = ALLOWED_FIELDS.get(axis)
    if axis_type == "bool":
        return cast(expr, Boolean)
    if axis_type == "int":
        return cast(expr, Integer)
    # Default: leave as Text (DSL "string" / unknown).
    return expr


def _column_for_axis(axis: str, subject: str | None = None):
    """Resolve a DSL axis to a SQLAlchemy column expression.

    The ``subject`` argument routes cross-cutting axes
    (``astro.*`` / ``calendar.*``) to the right per-subject substrate.
    On the Synchronicity table those are JSONB indexing expressions
    on ``astro_snapshot`` / ``calendar_stamp``. On the Entry table
    they're not yet materialised (the columns are Text-encoded JSON
    at B121) — calls from entry-subject queries raise.

    When ``subject`` is None, the older single-arg behaviour is
    preserved: cross-cutting axes raise. Existing callers (tests +
    code paths that don't yet route subject) keep working unchanged.
    """
    if axis in _ENTRY_AXES:
        return _ENTRY_AXES[axis]
    if axis in _SYNCHRONICITY_AXES:
        return _SYNCHRONICITY_AXES[axis]
    if axis in _JSONB_AXIS_PATHS:
        if subject == "synchronicity":
            return _jsonb_axis_expression(axis)
        if subject is None:
            raise ExecutionError(
                f"Axis {axis!r} requires a subject context to "
                "resolve. Cross-cutting axes (astro.* / calendar.*) "
                "are only materialised on the synchronicity subject.",
            )
        raise ExecutionError(
            f"Axis {axis!r} is declared in the DSL but not yet "
            f"materialised for subject {subject!r}. "
            "Cross-cutting axes currently route only to synchronicity.",
        )
    raise ExecutionError(
        f"Axis {axis!r} is declared in the DSL but not yet "
        "materialised in the schema. Hold off on this query until "
        "the column lands.",
    )


# ── Filter → SQL translation ─────────────────────────────────────


def _filter_touches_body_text(node: FilterNode) -> bool:
    """Detect whether any field-node in the tree filters on
    ``entry.body_text``. Used to decide whether to add the sealed
    exclusion."""
    if isinstance(node, FieldNode):
        return node.field == "entry.body_text"
    if isinstance(node, LogicalNode):
        return any(_filter_touches_body_text(c) for c in node.children)
    if isinstance(node, NotNode):
        return _filter_touches_body_text(node.child)
    return False


def _node_to_sql(node: FilterNode, subject: str | None = None):
    """Walk the filter tree and produce a SQLAlchemy boolean
    expression. ``subject`` is threaded so cross-cutting axes
    (astro.* / calendar.*) resolve correctly on the synchronicity
    subject — see ``_column_for_axis``."""
    if isinstance(node, LogicalNode):
        clauses = [_node_to_sql(c, subject) for c in node.children]
        return and_(*clauses) if node.op == "and" else or_(*clauses)
    if isinstance(node, NotNode):
        return not_(_node_to_sql(node.child, subject))
    if isinstance(node, FieldNode):
        col = _column_for_axis(node.field, subject)
        cmp = node.cmp
        v = node.value
        if cmp == "eq":
            return col == v
        if cmp == "ne":
            return col != v
        if cmp == "lt":
            return col < v
        if cmp == "le":
            return col <= v
        if cmp == "gt":
            return col > v
        if cmp == "ge":
            return col >= v
        if cmp == "in":
            return col.in_(v)
        if cmp == "nin":
            return col.notin_(v)
        if cmp == "contains":
            # For string columns: LIKE %v%. For id_list columns the
            # executor doesn't yet support contains (the JSONB
            # array containment operator lands when those columns
            # get migrated to proper arrays).
            axis_type = ALLOWED_FIELDS.get(node.field)
            if axis_type == "string":
                if isinstance(col.type, String) or hasattr(col, "ilike"):
                    return col.ilike(f"%{v}%")
                return col.like(f"%{v}%")
            raise ExecutionError(
                f"'contains' on non-string axis {node.field!r} is not "
                "yet supported.",
            )
        if cmp == "matches":
            # Postgres regex match.
            return col.op("~")(v)
        if cmp == "between":
            lo, hi = v
            return and_(col >= lo, col <= hi)
        raise ExecutionError(f"Unknown comparator: {cmp!r}.")
    raise ExecutionError(f"Unknown node type: {type(node).__name__!r}.")


# ── Subject narrowing ───────────────────────────────────────────


def _base_stmt_for_subject(subject: str, owner_id: UUID):
    if subject == "entry":
        return (
            select(Entry)
            .where(Entry.owner_id == owner_id)
            .where(Entry.deleted_at.is_(None))
        )
    if subject == "synchronicity":
        return (
            select(Synchronicity)
            .where(Synchronicity.owner_id == owner_id)
            .where(Synchronicity.deleted_at.is_(None))
        )
    if subject == "working":
        return (
            select(Entry)
            .where(Entry.owner_id == owner_id)
            .where(Entry.deleted_at.is_(None))
            .where(
                Entry.__table__.c.type.in_(_entry_type_values(_WORKING_ENTRY_TYPES))
            )
        )
    if subject == "divination":
        return (
            select(Entry)
            .where(Entry.owner_id == owner_id)
            .where(Entry.deleted_at.is_(None))
            .where(
                Entry.__table__.c.type.in_(
                    _entry_type_values(_DIVINATION_ENTRY_TYPES)
                )
            )
        )
    raise ExecutionError(f"Unknown subject: {subject!r}.")


def _row_to_dict(subject: str, row: Any) -> dict:
    if subject == "synchronicity":
        return {
            "id": str(row.id),
            "occurred_at": row.occurred_at.isoformat()
            if row.occurred_at
            else None,
            "category": row.category.value
            if hasattr(row.category, "value")
            else row.category,
            "intensity": row.intensity,
            "description": row.description,
        }
    # entry / working / divination → entry rows.
    # The Python attribute on the SQLModel class is ``type``; the
    # API surface alias is ``entry_type`` for downstream callers.
    entry_type = getattr(row, "type", None)
    return {
        "id": str(row.id),
        "entry_type": entry_type.value
        if hasattr(entry_type, "value")
        else entry_type,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "title": getattr(row, "title", None),
        "visibility": (
            row.visibility.value
            if hasattr(row.visibility, "value")
            else row.visibility
        )
        if getattr(row, "visibility", None) is not None
        else None,
    }


# ── execute_query ────────────────────────────────────────────────


async def execute_query(
    *,
    db: AsyncSession,
    owner_id: UUID,
    parsed: ParsedQuery,
) -> QueryExecutionResult:
    """Validate then execute the parsed query against the caller's
    vault. The B121 ``validate`` is run defensively here too — even
    though /run already does it — so direct callers of the executor
    can't bypass it.

    Returns ``QueryExecutionResult``. Sealed entries' body text
    NEVER appears in ``rows`` when the filter tree touches
    ``entry.body_text``. The ``sealed_excluded_count`` field reports
    how many sealed entries would have matched the rest of the
    filter (if any) — count-only.
    """
    dsl_validate(parsed)

    base = _base_stmt_for_subject(parsed.subject, owner_id)

    # Apply each top-level filter as a conjunction. Subject is
    # threaded so cross-cutting axes (astro.* / calendar.*) resolve
    # to the right per-subject substrate.
    where_clauses = [_node_to_sql(f, parsed.subject) for f in parsed.filters]

    # Sealed exclusion: applies to any subject that maps to the
    # entry table when the filter tree touches body_text.
    sealed_exclusion_applied = False
    if parsed.subject in ("entry", "working", "divination"):
        touches_body = any(_filter_touches_body_text(f) for f in parsed.filters)
        if touches_body:
            where_clauses.append(
                Entry.encryption_mode != EncryptionMode.SEALED
            )
            sealed_exclusion_applied = True

    stmt = base
    for clause in where_clauses:
        stmt = stmt.where(clause)

    # Order by
    if parsed.order_by:
        for ob in parsed.order_by:
            col = _column_for_axis(ob.field, parsed.subject)
            stmt = stmt.order_by(col.desc() if ob.dir == "desc" else col.asc())

    # Cap result rows. Honour DSL `limit` when smaller than the cap.
    effective_limit = min(
        parsed.limit if parsed.limit is not None else RESULT_ROW_CAP,
        RESULT_ROW_CAP,
    )

    # COUNT total without limit (for total_rows).
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    rows_stmt = stmt.limit(effective_limit)
    rows = (await db.execute(rows_stmt)).scalars().all()
    row_dicts = [_row_to_dict(parsed.subject, r) for r in rows]

    # Sealed-excluded count: how many sealed entries would have
    # matched if we hadn't applied the sealed_excluded clause.
    sealed_excluded_count = 0
    if sealed_exclusion_applied:
        # Re-run without the sealed clause, ONLY counting sealed
        # rows (the count-only safe indicator). Body-text filters
        # are not applied to sealed rows (they'd return zero by
        # the indexer rule), so we count the structural shape: how
        # many sealed entries the caller has that match the non-
        # body-text filters.
        non_body_clauses = [
            c
            for c in [
                _node_to_sql(f, parsed.subject)
                for f in parsed.filters
                if not _filter_touches_body_text(f)
            ]
        ]
        sealed_stmt = (
            select(func.count(Entry.id))
            .where(Entry.owner_id == owner_id)
            .where(Entry.deleted_at.is_(None))
            .where(Entry.encryption_mode == EncryptionMode.SEALED)
        )
        for c in non_body_clauses:
            sealed_stmt = sealed_stmt.where(c)
        sealed_excluded_count = int(
            (await db.execute(sealed_stmt)).scalar_one()
        )

    # group_by + count aggregate
    groups: list[GroupRow] | None = None
    aggregate_value: float | None = None
    if parsed.group_by and len(parsed.group_by) == 1:
        group_axis = parsed.group_by[0]
        # JSONB-axis group-by isn't supported yet — the subquery
        # path uses ``sub.c[col.name]`` which a JSONB expression
        # doesn't have. A future batch can add a named-label hook.
        if group_axis in _JSONB_AXIS_PATHS:
            raise ExecutionError(
                f"Group-by on JSONB axis {group_axis!r} is not yet "
                "supported. Use a synchronicity.* or entry.* axis "
                "for grouping.",
            )
        group_col = _column_for_axis(group_axis, parsed.subject)
        group_stmt = (
            select(group_col, func.count())
            .select_from(stmt.subquery())
        )
        # The subquery already carries the filters; we just need to
        # group + count.
        group_stmt = (
            select(group_col, func.count())
            .where(*where_clauses)
            .select_from(base.subquery())
        )
        # Note: SQLAlchemy quirk — we re-apply WHERE on the base
        # stmt's subquery to keep grouping straightforward.
        # Simpler: just rebuild.
        base_for_group = _base_stmt_for_subject(parsed.subject, owner_id)
        for c in where_clauses:
            base_for_group = base_for_group.where(c)
        sub = base_for_group.subquery()
        # We need to reach the grouping column from the subquery; use
        # the named column on the subquery.
        try:
            grouped_col = sub.c[group_col.name]
        except KeyError as exc:
            raise ExecutionError(
                f"Could not reach grouping column "
                f"{parsed.group_by[0]!r} from the subject subquery.",
            ) from exc
        gstmt = (
            select(grouped_col, func.count().label("c"))
            .group_by(grouped_col)
            .order_by(func.count().desc())
        )
        # Sub.c[group_col.name] needs the sub in the FROM list.
        gstmt = gstmt.select_from(sub)
        gresult = (await db.execute(gstmt)).all()
        groups = [
            GroupRow(
                group_key=(
                    row[0].value if hasattr(row[0], "value") else row[0]
                ),
                count=int(row[1]),
            )
            for row in gresult
        ]
        if parsed.aggregate == "count":
            aggregate_value = float(total)

    if parsed.aggregate == "count" and groups is None:
        aggregate_value = float(total)

    return QueryExecutionResult(
        total_rows=total,
        rows=row_dicts,
        groups=groups,
        aggregate_value=aggregate_value,
        sealed_excluded_count=sealed_excluded_count,
    )
