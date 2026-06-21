"""Search substrate tests.

Pure-Python tests of the SearchRequest dataclass shape + the Pydantic
schemas. The Postgres FTS query is tested against a real database in
the integration tests (deploy round-trip via curl); these tests cover
the typed-input contract.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.search import SearchRequest


# ───── SearchRequest dataclass ──────────────────────────────────────────


def test_search_request_default_has_no_filters() -> None:
    request = SearchRequest()
    assert request.query is None
    assert request.kinds is None
    assert request.visibilities is None
    assert request.owner_id is None
    assert request.occurred_after is None
    assert request.occurred_before is None
    assert request.tag_ids == ()
    assert request.entity_ids == ()
    assert request.limit == 20
    assert request.offset == 0


def test_search_request_carries_query_and_filters() -> None:
    from theourgia.models.entries import EntryType, EntryVisibility

    request = SearchRequest(
        query="hekate offering",
        kinds=(EntryType.WORKING, EntryType.RITUAL_LOG),
        visibilities=(EntryVisibility.PERSONAL,),
        occurred_after=datetime(2026, 1, 1, tzinfo=UTC),
        occurred_before=datetime(2026, 12, 31, tzinfo=UTC),
        limit=50,
        offset=20,
    )
    assert request.query == "hekate offering"
    assert request.kinds is not None
    assert len(request.kinds) == 2
    assert request.limit == 50
    assert request.offset == 20


def test_search_request_kinds_list_can_be_empty_via_tuple() -> None:
    """The empty-tuple sentinel for 'no filter' is the documented shape."""
    request = SearchRequest(kinds=())
    assert request.kinds == ()


# ───── Pydantic API schema ──────────────────────────────────────────────


def test_search_response_shape_imports() -> None:
    """Smoke check: the response model + router import cleanly."""
    from theourgia.api.routers.v1.search import SearchResponse, router  # noqa: F401

    # Construct a minimal response to verify the schema:
    response = SearchResponse(hits=[], total=0, limit=20, offset=0)
    assert response.total == 0
    assert response.limit == 20


def test_search_endpoint_registered() -> None:
    """The /search endpoint is on the router."""
    from theourgia.api.routers.v1.search import router

    paths = {route.path for route in router.routes}
    assert "/search" in paths
