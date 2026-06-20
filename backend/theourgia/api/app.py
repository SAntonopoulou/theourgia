"""FastAPI application factory and singleton.

The :func:`create_app` factory builds and returns a fully-configured
FastAPI app: lifespan, middleware, error handlers, routers, OpenAPI
customization. Tests build their own instance via the factory; the
``uvicorn theourgia.api.app:app`` entry point uses the
module-level :data:`app` singleton.

OpenAPI docs are exposed only in non-production environments by
default; ``/api/openapi.json`` is always available for machine
consumers (clients generate types from it). Production deployments can
opt back into the docs UI by setting the appropriate env var.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI

from theourgia.__about__ import __license__, __project_url__, __version__
from theourgia.api.errors import register_error_handlers
from theourgia.api.lifespan import lifespan
from theourgia.api.middleware import register_middleware
from theourgia.api.routers import register_routers
from theourgia.core.config import get_settings
from theourgia.core.observability import configure_logging, get_logger

__all__ = ["create_app", "app"]


DESCRIPTION = """\
Theourgia — a magickal journal CMS and full practitioner toolkit.

This API exposes the journal, entities, divinations, sigils, federation
primitives, and admin surfaces of a Theourgia instance. Versioned under
``/api/v1``. Authentication uses bearer tokens issued by the session
endpoints.

Open source, federated, self-hostable. AGPL-3.0 forever.
"""


def create_app() -> FastAPI:
    """Construct a fresh FastAPI app. Idempotent across calls."""
    settings = get_settings()

    # Configure structured logging before anything else can emit a line
    # in stdlib format. Idempotent across repeated calls.
    configure_logging(
        level=settings.log_level.upper(),
        json_output=settings.resolved_log_format == "json",
    )

    is_dev_or_test = settings.is_development or settings.is_test
    docs_url = "/api/docs" if is_dev_or_test else None
    redoc_url = "/api/redoc" if is_dev_or_test else None

    app = FastAPI(
        title="Theourgia",
        version=__version__,
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url="/api/openapi.json",
        license_info={
            "name": __license__,
            "url": "https://www.gnu.org/licenses/agpl-3.0.html",
        },
        contact={
            "name": "Theourgia",
            "url": __project_url__,
        },
        terms_of_service=None,
        # OpenAPI servers list (helps tooling generate correct URLs)
        servers=[{"url": settings.base_url}] if settings.base_url else None,
    )

    register_error_handlers(app)
    register_middleware(app, settings)
    register_routers(app)

    _customize_openapi(app)

    get_logger(__name__).info(
        "app.created", env=settings.env, version=__version__
    )

    return app


def _customize_openapi(app: FastAPI) -> None:
    """Add Theourgia-specific OpenAPI metadata.

    Adds the bearer security scheme so authenticated endpoints render
    correctly in Swagger UI and so generated clients pick up the auth
    shape.
    """

    original = app.openapi

    def customized() -> dict[str, Any]:
        schema = original()
        # Security scheme: bearer token
        components = schema.setdefault("components", {})
        sec_schemes = components.setdefault("securitySchemes", {})
        sec_schemes["bearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "description": "Session token issued by /api/v1/auth/login (Phase 01 Batch 6+)",
        }
        return schema

    app.openapi = customized  # type: ignore[method-assign]


# Singleton instance for ``uvicorn theourgia.api.app:app``
app = create_app()
