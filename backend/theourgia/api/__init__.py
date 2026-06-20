"""Theourgia HTTP API.

The application is constructed via :func:`create_app` so it can be
instantiated multiple times (tests, scripts) without process-wide side
effects. The standard entry point ``theourgia.api.app:app`` exposes
one configured instance for ``uvicorn theourgia.api.app:app``.

The API surface is versioned: external clients call ``/api/v1/*``;
internal health / docs / OpenAPI live under ``/healthz``, ``/readyz``,
``/api/docs``, ``/api/openapi.json``.
"""

from __future__ import annotations

from theourgia.api.app import app, create_app

__all__ = ["app", "create_app"]
