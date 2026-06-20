"""Entry point — run the Theourgia backend via Uvicorn.

Usage::

    python -m theourgia                       # uvicorn-wrapped server
    uvicorn theourgia.api.app:app             # direct uvicorn invocation

The Docker images use ``uvicorn theourgia.api.app:app`` so process
management (workers, lifecycle, reload in dev) lives in uvicorn rather
than this module.
"""

from __future__ import annotations


def main() -> None:
    """Run the Theourgia backend via Uvicorn.

    Reads ``HOST`` and ``PORT`` from the environment (defaults
    ``0.0.0.0:8000``). For development with hot reload, pass ``--reload``
    via ``uvicorn theourgia.api.app:app --reload`` instead — this entry
    point is for production / scripted runs.
    """
    import os

    import uvicorn

    uvicorn.run(
        "theourgia.api.app:app",
        host=os.environ.get("HOST", "0.0.0.0"),  # noqa: S104 — bind 0.0.0.0 by intent
        port=int(os.environ.get("PORT", "8000")),
        log_level=os.environ.get("THEOURGIA_LOG_LEVEL", "info").lower(),
    )


if __name__ == "__main__":
    main()
