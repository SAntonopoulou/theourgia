"""Optional crash reporting via Sentry.

**This is opt-in.** Theourgia ships with zero telemetry by default —
the ``/api/v1/meta`` endpoint reports ``telemetry: "none"`` and the
zero-telemetry verifier (Phase 01 Batch 10) enforces that.

An operator who *wants* crash reporting on their own instance sets
``THEOURGIA_SENTRY_DSN`` in their environment; this module reads it and
initializes sentry-sdk. No DSN = no Sentry — :func:`init_sentry` is a
no-op.

``sentry-sdk`` is not in the core dependency set so the default install
has no Sentry code path at all. Operators add it via:

.. code-block:: bash

    pip install 'theourgia[sentry]'

or by installing ``sentry-sdk`` alongside their own deployment.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from theourgia.core.config import Settings

__all__ = ["init_sentry"]

_log = logging.getLogger(__name__)


def init_sentry(settings: "Settings") -> bool:
    """Initialize Sentry from the supplied settings.

    Returns ``True`` iff Sentry was actually initialized. Returns
    ``False`` (and emits a single log line) when:

    - no DSN is configured (zero-telemetry default — silent),
    - a DSN is configured but ``sentry-sdk`` is not installed (warns).

    Tracing sample rate and PII handling are conservative: traces off,
    PII not sent. Operators who want either tweak it via
    ``THEOURGIA_SENTRY_TRACES_SAMPLE_RATE`` / their own ``before_send``
    hook in a future config knob.
    """
    dsn = settings.sentry_dsn.get_secret_value() if settings.sentry_dsn else ""
    if not dsn:
        return False

    try:
        import sentry_sdk
    except ImportError:
        _log.warning(
            "sentry.dsn_set_but_sdk_missing",
            extra={
                "hint": "pip install sentry-sdk to enable crash reporting",
            },
        )
        return False

    integrations: list[object] = []
    try:  # FastAPI integration is lazy — only load if FastAPI is in use
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        integrations.append(FastApiIntegration())
    except Exception:  # noqa: BLE001 — best-effort
        pass

    try:
        from sentry_sdk.integrations.celery import CeleryIntegration

        integrations.append(CeleryIntegration())
    except Exception:  # noqa: BLE001
        pass

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.env,
        release=getattr(settings, "release", None),
        integrations=integrations,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )
    _log.info("sentry.initialized", extra={"environment": settings.env})
    return True
