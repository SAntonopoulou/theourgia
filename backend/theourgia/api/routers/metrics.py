"""Prometheus metrics endpoint.

``GET /metrics`` — admin-scoped. Returns the registry's contents in the
Prometheus text exposition format.

Why admin-scoped and not unauthenticated? The metrics surface is rich
enough to fingerprint the instance (request counts per route, plugin
counts, etc.). Public exposure would leak more than is wise for a
practitioner-hosted instance. Operators who run a separate metrics
sidecar can punch a firewall hole + an internal scrape; that's a
deliberate operator choice, not the default.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from theourgia.api.deps import require_scope
from theourgia.core.authz import Scope
from theourgia.core.observability.metrics import render_metrics

__all__ = ["router"]

router = APIRouter()


@router.get(
    "/metrics",
    summary="Prometheus metrics (admin-scoped)",
    description=(
        "Returns the instance's Prometheus metrics in the text "
        "exposition format. Requires admin scope. **Off by default for "
        "public consumption** to avoid fingerprinting; operators who run "
        "a metrics sidecar set up their own scrape with an admin token."
    ),
    response_class=Response,
    responses={
        200: {
            "content": {"text/plain; version=0.0.4; charset=utf-8": {}},
            "description": "Prometheus exposition-format metrics body",
        },
        401: {"description": "Missing bearer token"},
        403: {"description": "Insufficient scope"},
    },
)
async def metrics(
    _user: object = Depends(require_scope(Scope.ADMIN_OBSERVE)),  # noqa: B008
) -> Response:
    body, content_type = render_metrics()
    return Response(content=body, media_type=content_type)
