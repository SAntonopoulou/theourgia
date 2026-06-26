"""Saved-query DSL (B121).

Per ``plan/09-batches-backend.md`` § B121.

A ``Study.query`` for ``StudyKind.QUERY_BUILDER`` follows this JSON
shape:

  {
    "version": 1,
    "subject": "entry" | "working" | "synchronicity" | "divination",
    "filters": [<node>, ...],
    "group_by": [<axis>, ...] | null,
    "order_by": [{"field": <axis>, "dir": "asc"|"desc"}, ...] | null,
    "limit": <int> | null,
    "aggregate": "count" | "mean" | "sum" | "histogram" | null,
    "aggregate_axis": <axis> | null
  }

Filter nodes are recursive:

  {"op": "and", "children": [<node>, ...]}
  {"op": "or",  "children": [<node>, ...]}
  {"op": "not", "child":   <node>}
  {"field": <axis>, "cmp": <comparator>, "value": <json>}

Axes are namespaced as ``<subject_table>.<column>`` and are frozen
at v1. New axes (or new subjects, or new comparators) bump the
version. The parser rejects anything that doesn't match the frozen
catalog so a study's stored query stays portable across future
versions.

This module ships only the parse + validate functions in B121. The
actual SQL executor lands in B122. The split keeps the validator
testable in isolation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

__all__ = [
    "Comparator",
    "DSLValidationError",
    "FieldNode",
    "FilterNode",
    "LogicalNode",
    "NotNode",
    "OrderBy",
    "ParsedQuery",
    "AGGREGATES",
    "ALLOWED_FIELDS",
    "COMPARATORS",
    "DSL_VERSION",
    "SUBJECTS",
    "parse",
    "validate",
    "validate_field_against_subject",
]


DSL_VERSION = 1


# ── Frozen catalogs ──────────────────────────────────────────────


SUBJECTS: tuple[str, ...] = (
    "entry",
    "working",
    "synchronicity",
    "divination",
)

# Comparators frozen at v1. Aliases ("=", "==") rejected — the parser
# is intentionally strict.
COMPARATORS: tuple[str, ...] = (
    "eq",
    "ne",
    "lt",
    "le",
    "gt",
    "ge",
    "in",
    "nin",
    "contains",
    "matches",
    "between",
)

Comparator = Literal[
    "eq",
    "ne",
    "lt",
    "le",
    "gt",
    "ge",
    "in",
    "nin",
    "contains",
    "matches",
    "between",
]


AGGREGATES: tuple[str, ...] = ("count", "mean", "sum", "histogram")


# Axes are namespaced. Each subject sees its own table's columns
# plus the cross-cutting axes (astro, calendar). Some axes have a
# known type that the validator uses to typecheck the ``value``.

_AxisTypes = Literal["string", "int", "float", "datetime", "id_list", "bool"]


ALLOWED_FIELDS: dict[str, _AxisTypes] = {
    # entry.*
    "entry.created_at": "datetime",
    "entry.captured_at": "datetime",
    "entry.entry_type": "string",
    "entry.body_text": "string",
    "entry.encryption_mode": "string",
    "entry.visibility": "string",
    "entry.linked_entity_ids": "id_list",
    "entry.linked_working_ids": "id_list",
    # working.*
    "working.created_at": "datetime",
    "working.outcome_rating": "float",
    "working.tradition_tags": "id_list",
    # synchronicity.*
    "synchronicity.occurred_at": "datetime",
    "synchronicity.category": "string",
    "synchronicity.intensity": "int",
    "synchronicity.linked_entry_ids": "id_list",
    "synchronicity.linked_entity_ids": "id_list",
    "synchronicity.linked_working_ids": "id_list",
    # divination.*
    "divination.created_at": "datetime",
    "divination.kind": "string",
    # astro.* (cross-cutting — every subject row carries an
    # astro_snapshot)
    "astro.moon_phase": "string",
    "astro.planetary_hour": "string",
    "astro.sun_sign": "string",
    "astro.moon_sign": "string",
    "astro.has_aspect_to_natal": "bool",
    # calendar.* (cross-cutting)
    "calendar.season": "string",
    "calendar.festival": "string",
    "calendar.weekday": "string",
}


# Which subjects each axis is reachable from. The cross-cutting
# axes (astro.*, calendar.*) are reachable from every subject. Each
# subject-namespaced axis is reachable only from that subject (an
# entry.body_text filter only makes sense when the subject is
# "entry").

def _subjects_for_axis(axis: str) -> tuple[str, ...]:
    if axis.startswith("astro.") or axis.startswith("calendar."):
        return SUBJECTS
    prefix = axis.split(".", 1)[0]
    return (prefix,) if prefix in SUBJECTS else ()


# ── Dataclass nodes ──────────────────────────────────────────────


@dataclass(frozen=True)
class FieldNode:
    field: str
    cmp: Comparator
    value: Any


@dataclass(frozen=True)
class LogicalNode:
    op: Literal["and", "or"]
    children: tuple["FilterNode", ...]


@dataclass(frozen=True)
class NotNode:
    child: "FilterNode"


FilterNode = FieldNode | LogicalNode | NotNode


@dataclass(frozen=True)
class OrderBy:
    field: str
    dir: Literal["asc", "desc"]


@dataclass(frozen=True)
class ParsedQuery:
    version: int = 1
    subject: str = "entry"
    filters: tuple[FilterNode, ...] = field(default_factory=tuple)
    group_by: tuple[str, ...] | None = None
    order_by: tuple[OrderBy, ...] | None = None
    limit: int | None = None
    aggregate: str | None = None
    aggregate_axis: str | None = None


# ── Errors ───────────────────────────────────────────────────────


class DSLValidationError(ValueError):
    """Raised when a query JSON doesn't conform to the DSL.

    The error message is human-readable and safe to surface in API
    responses ("Stored query is invalid: <reason>").
    """


# ── Parsing ──────────────────────────────────────────────────────


def _parse_filter_node(raw: Any) -> FilterNode:
    if not isinstance(raw, dict):
        raise DSLValidationError(
            f"Filter node must be an object; got {type(raw).__name__}.",
        )
    if "op" in raw:
        op_value = raw["op"]
        if op_value in ("and", "or"):
            children_raw = raw.get("children")
            if not isinstance(children_raw, list):
                raise DSLValidationError(
                    f"'{op_value}' node requires a children list.",
                )
            if len(children_raw) == 0:
                raise DSLValidationError(
                    f"'{op_value}' node cannot be empty.",
                )
            children = tuple(_parse_filter_node(c) for c in children_raw)
            extra = set(raw.keys()) - {"op", "children"}
            if extra:
                raise DSLValidationError(
                    f"Unknown keys on '{op_value}' node: {sorted(extra)!r}.",
                )
            return LogicalNode(op=op_value, children=children)
        if op_value == "not":
            child_raw = raw.get("child")
            if child_raw is None:
                raise DSLValidationError("'not' node requires a child.")
            extra = set(raw.keys()) - {"op", "child"}
            if extra:
                raise DSLValidationError(
                    f"Unknown keys on 'not' node: {sorted(extra)!r}.",
                )
            return NotNode(child=_parse_filter_node(child_raw))
        raise DSLValidationError(
            f"Unknown logical op: {op_value!r}.",
        )

    # Field node
    if "field" not in raw or "cmp" not in raw:
        raise DSLValidationError(
            "Field node requires both 'field' and 'cmp' keys.",
        )
    field_name = raw["field"]
    cmp = raw["cmp"]
    if not isinstance(field_name, str):
        raise DSLValidationError(
            "Field 'field' must be a string.",
        )
    if cmp not in COMPARATORS:
        raise DSLValidationError(
            f"Unknown comparator {cmp!r}. Allowed: {COMPARATORS}.",
        )
    if "value" not in raw:
        raise DSLValidationError(
            f"Field node for {field_name!r} requires a 'value'.",
        )
    extra = set(raw.keys()) - {"field", "cmp", "value"}
    if extra:
        raise DSLValidationError(
            f"Unknown keys on field node {field_name!r}: {sorted(extra)!r}.",
        )
    return FieldNode(field=field_name, cmp=cmp, value=raw["value"])


def parse(raw: dict) -> ParsedQuery:
    """Parse a raw JSON dict into a ``ParsedQuery`` dataclass tree.

    Raises ``DSLValidationError`` on any structural problem. The
    returned dataclass is frozen — downstream code can rely on
    immutability.

    Pure: no I/O. Tests drive this directly.
    """
    if not isinstance(raw, dict):
        raise DSLValidationError(
            f"Query must be an object; got {type(raw).__name__}.",
        )

    version = raw.get("version", 1)
    if version != DSL_VERSION:
        raise DSLValidationError(
            f"Unsupported DSL version: {version!r} (expected {DSL_VERSION}).",
        )

    subject = raw.get("subject")
    if subject not in SUBJECTS:
        raise DSLValidationError(
            f"Unknown subject {subject!r}. Allowed: {SUBJECTS}.",
        )

    filters_raw = raw.get("filters", [])
    if not isinstance(filters_raw, list):
        raise DSLValidationError(
            "'filters' must be a list of filter nodes.",
        )
    filters = tuple(_parse_filter_node(f) for f in filters_raw)

    group_by_raw = raw.get("group_by")
    group_by: tuple[str, ...] | None
    if group_by_raw is None:
        group_by = None
    elif isinstance(group_by_raw, list):
        if not all(isinstance(g, str) for g in group_by_raw):
            raise DSLValidationError(
                "'group_by' entries must be strings.",
            )
        group_by = tuple(group_by_raw)
    else:
        raise DSLValidationError(
            "'group_by' must be a list of axis names or null.",
        )

    order_by_raw = raw.get("order_by")
    order_by: tuple[OrderBy, ...] | None
    if order_by_raw is None:
        order_by = None
    elif isinstance(order_by_raw, list):
        ob: list[OrderBy] = []
        for entry in order_by_raw:
            if not isinstance(entry, dict):
                raise DSLValidationError(
                    "'order_by' entries must be objects.",
                )
            f = entry.get("field")
            d = entry.get("dir", "asc")
            if not isinstance(f, str):
                raise DSLValidationError(
                    "order_by 'field' must be a string.",
                )
            if d not in ("asc", "desc"):
                raise DSLValidationError(
                    f"order_by 'dir' must be 'asc' or 'desc'; got {d!r}.",
                )
            ob.append(OrderBy(field=f, dir=d))
        order_by = tuple(ob)
    else:
        raise DSLValidationError(
            "'order_by' must be a list or null.",
        )

    limit_raw = raw.get("limit")
    if limit_raw is None:
        limit: int | None = None
    elif isinstance(limit_raw, bool) or not isinstance(limit_raw, int):
        raise DSLValidationError(
            "'limit' must be an integer or null.",
        )
    elif limit_raw < 1:
        raise DSLValidationError(
            "'limit' must be positive.",
        )
    else:
        limit = limit_raw

    aggregate = raw.get("aggregate")
    if aggregate is not None and aggregate not in AGGREGATES:
        raise DSLValidationError(
            f"Unknown aggregate {aggregate!r}. "
            f"Allowed: {AGGREGATES}.",
        )

    aggregate_axis = raw.get("aggregate_axis")
    if aggregate_axis is not None and not isinstance(aggregate_axis, str):
        raise DSLValidationError(
            "'aggregate_axis' must be a string axis name or null.",
        )

    return ParsedQuery(
        version=version,
        subject=subject,
        filters=filters,
        group_by=group_by,
        order_by=order_by,
        limit=limit,
        aggregate=aggregate,
        aggregate_axis=aggregate_axis,
    )


# ── Validation ───────────────────────────────────────────────────


def validate_field_against_subject(field_name: str, subject: str) -> None:
    """Confirm that ``field_name`` is a known axis AND that it's
    reachable from ``subject``."""
    if field_name not in ALLOWED_FIELDS:
        raise DSLValidationError(
            f"Unknown axis: {field_name!r}.",
        )
    if subject not in _subjects_for_axis(field_name):
        raise DSLValidationError(
            f"Axis {field_name!r} is not reachable from subject "
            f"{subject!r}.",
        )


def _validate_value_for_comparator(
    field_name: str, cmp: Comparator, value: Any,
) -> None:
    axis_type = ALLOWED_FIELDS[field_name]

    if cmp in ("in", "nin"):
        if not isinstance(value, list):
            raise DSLValidationError(
                f"'{cmp}' on {field_name!r} requires a list value.",
            )
        if len(value) == 0:
            raise DSLValidationError(
                f"'{cmp}' on {field_name!r} requires a non-empty list.",
            )
        return

    if cmp == "between":
        if not isinstance(value, list) or len(value) != 2:
            raise DSLValidationError(
                f"'between' on {field_name!r} requires [lo, hi].",
            )
        return

    if cmp == "contains":
        if axis_type == "string" and not isinstance(value, str):
            raise DSLValidationError(
                f"'contains' on {field_name!r} requires a string value.",
            )
        if axis_type == "id_list" and not isinstance(value, str):
            raise DSLValidationError(
                f"'contains' on {field_name!r} (id_list) requires "
                "a string id.",
            )
        return

    if cmp == "matches":
        if not isinstance(value, str):
            raise DSLValidationError(
                f"'matches' on {field_name!r} requires a string regex.",
            )
        return

    # Numeric / ordered comparators: lt / le / gt / ge / eq / ne
    if axis_type == "bool":
        if not isinstance(value, bool):
            raise DSLValidationError(
                f"Boolean axis {field_name!r} requires a boolean value.",
            )
        if cmp not in ("eq", "ne"):
            raise DSLValidationError(
                f"Boolean axis {field_name!r} accepts only 'eq'/'ne'; "
                f"got {cmp!r}.",
            )
        return
    if axis_type in ("int", "float"):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise DSLValidationError(
                f"Numeric axis {field_name!r} requires a number.",
            )
        return
    if axis_type == "datetime":
        if not isinstance(value, str):
            raise DSLValidationError(
                f"Datetime axis {field_name!r} requires an ISO-8601 string.",
            )
        return
    if axis_type == "string":
        if not isinstance(value, str):
            raise DSLValidationError(
                f"String axis {field_name!r} requires a string value.",
            )
        return
    if axis_type == "id_list":
        # eq/ne on an id_list don't make sense; only contains + in/nin.
        raise DSLValidationError(
            f"Axis {field_name!r} (id_list) accepts only 'contains', "
            "'in', or 'nin'.",
        )


def _validate_filter_node_axes(node: FilterNode, subject: str) -> None:
    if isinstance(node, FieldNode):
        validate_field_against_subject(node.field, subject)
        _validate_value_for_comparator(node.field, node.cmp, node.value)
        return
    if isinstance(node, LogicalNode):
        for child in node.children:
            _validate_filter_node_axes(child, subject)
        return
    if isinstance(node, NotNode):
        _validate_filter_node_axes(node.child, subject)
        return
    raise DSLValidationError(
        f"Unknown filter node type: {type(node).__name__}.",
    )


def validate(parsed: ParsedQuery) -> None:
    """Validate axes + values against the frozen catalog.

    ``parse`` already enforces the structural shape; ``validate``
    enforces semantic rules: every axis exists, the value type
    matches the axis type, group_by + order_by + aggregate_axis
    reference real axes reachable from the subject.

    Raises ``DSLValidationError`` on the first problem.
    """
    for node in parsed.filters:
        _validate_filter_node_axes(node, parsed.subject)

    if parsed.group_by is not None:
        for axis in parsed.group_by:
            validate_field_against_subject(axis, parsed.subject)

    if parsed.order_by is not None:
        for ob in parsed.order_by:
            validate_field_against_subject(ob.field, parsed.subject)

    if parsed.aggregate is None and parsed.aggregate_axis is not None:
        raise DSLValidationError(
            "'aggregate_axis' set without an 'aggregate' op.",
        )
    if parsed.aggregate_axis is not None:
        validate_field_against_subject(parsed.aggregate_axis, parsed.subject)

    if parsed.aggregate == "mean" or parsed.aggregate == "sum":
        if parsed.aggregate_axis is None:
            raise DSLValidationError(
                f"Aggregate {parsed.aggregate!r} requires an "
                "'aggregate_axis'.",
            )
        axis_type = ALLOWED_FIELDS[parsed.aggregate_axis]
        if axis_type not in ("int", "float"):
            raise DSLValidationError(
                f"Aggregate {parsed.aggregate!r} requires a numeric axis; "
                f"got {parsed.aggregate_axis!r} ({axis_type}).",
            )
