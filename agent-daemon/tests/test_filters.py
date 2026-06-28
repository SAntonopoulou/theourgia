"""Rule 52 + 53 filter tests — the daemon's defence-in-depth pass.

These are the load-bearing tests. If they ever go red, the daemon
MUST not ship — the architectural promise is that sealed and closed-
tradition content NEVER reaches the agent.
"""

from __future__ import annotations

from theourgia_agent.mcp.filters import (
    filter_records,
    is_closed_tradition,
    is_sealed,
)


def test_rule_53_sealed_record_is_dropped() -> None:
    records = [
        {"id": "a", "sealed": False, "body": "open content"},
        {"id": "b", "sealed": True, "body": "(ciphertext)"},
        {"id": "c", "sealed": False, "body": "another open one"},
    ]
    out = filter_records(records)
    assert [r["id"] for r in out] == ["a", "c"]


def test_rule_52_closed_tradition_record_is_dropped() -> None:
    records = [
        {"id": "a", "tradition_tags": ["hellenic"], "body": "open"},
        {"id": "b", "tradition_tags": ["closed-lakota-x"], "body": "closed"},
        {"id": "c", "tradition_tags": [], "body": "untagged"},
    ]
    out = filter_records(
        records, closed_tradition_slugs=frozenset({"closed-lakota-x"}),
    )
    assert [r["id"] for r in out] == ["a", "c"]


def test_filters_compose_sealed_and_closed_tradition() -> None:
    """Both filters apply; either condition drops the record."""
    records = [
        {"id": "a", "sealed": False, "tradition_tags": ["hellenic"]},
        {"id": "b", "sealed": True, "tradition_tags": ["hellenic"]},
        {"id": "c", "sealed": False, "tradition_tags": ["closed-x"]},
        {"id": "d", "sealed": True, "tradition_tags": ["closed-x"]},
        {"id": "e", "sealed": False, "tradition_tags": []},
    ]
    out = filter_records(
        records, closed_tradition_slugs=frozenset({"closed-x"}),
    )
    assert [r["id"] for r in out] == ["a", "e"]


def test_filter_preserves_record_order() -> None:
    """Surviving records keep the input order — important for the
    activity-log summarisation that may rely on chronological flow."""
    records = [{"id": str(i), "sealed": False} for i in range(10)]
    out = filter_records(records)
    assert [r["id"] for r in out] == [str(i) for i in range(10)]


def test_filter_does_not_mutate_input() -> None:
    records = [
        {"id": "a", "sealed": False},
        {"id": "b", "sealed": True},
    ]
    before = list(records)
    _ = filter_records(records)
    assert records == before


def test_empty_closed_slug_set_never_drops_for_closed_tradition() -> None:
    records = [{"id": "a", "tradition_tags": ["x", "y", "z"]}]
    out = filter_records(records, closed_tradition_slugs=frozenset())
    assert [r["id"] for r in out] == ["a"]


def test_missing_sealed_field_treated_as_open() -> None:
    """Older fixtures + tests don't set the sealed flag — they're open
    by default. Production data ALWAYS sets it; this is the safe
    fallback for development."""
    records = [{"id": "a", "body": "no sealed field"}]
    out = filter_records(records)
    assert [r["id"] for r in out] == ["a"]


def test_missing_tradition_tags_treated_as_untagged() -> None:
    records = [{"id": "a", "body": "no tags"}]
    out = filter_records(
        records, closed_tradition_slugs=frozenset({"closed-x"}),
    )
    assert [r["id"] for r in out] == ["a"]


def test_is_sealed_helper_handles_truthy_falsy() -> None:
    assert is_sealed({"sealed": True}) is True
    assert is_sealed({"sealed": False}) is False
    assert is_sealed({}) is False
    # Non-boolean truthy values still count as sealed
    assert is_sealed({"sealed": 1}) is True
    assert is_sealed({"sealed": "yes"}) is True


def test_is_closed_tradition_any_tag_match_is_enough() -> None:
    """A record carrying MULTIPLE tags drops if ANY one of them is in
    the closed set — the magician's most-restrictive tag wins."""
    record = {"tradition_tags": ["hellenic", "closed-x", "kabbalah"]}
    assert (
        is_closed_tradition(record, frozenset({"closed-x"})) is True
    )


def test_property_no_sealed_record_ever_passes() -> None:
    """Spec-style invariant: for any combination of inputs, NO sealed
    record ever appears in the output."""
    import random

    random.seed(42)
    for _ in range(100):
        n = random.randint(0, 20)
        records = [
            {
                "id": str(i),
                "sealed": random.choice([True, False]),
                "tradition_tags": random.choice(
                    [[], ["hellenic"], ["closed-x"], ["closed-x", "thelemic"]],
                ),
            }
            for i in range(n)
        ]
        out = filter_records(
            records, closed_tradition_slugs=frozenset({"closed-x"}),
        )
        for record in out:
            assert record.get("sealed") is False, (
                f"sealed record leaked through: {record}"
            )
            for tag in record.get("tradition_tags") or []:
                assert tag != "closed-x", (
                    f"closed-tradition record leaked through: {record}"
                )
