"""GDPR service — orchestrates export and deletion across features.

Features register their exporters and deletion handlers; the service
iterates the registries on demand.

The central endpoints — ``GET /api/v1/me/data-export`` and
``DELETE /api/v1/me/account`` — call into this service. The substrate
ships without those endpoints (Phase 02 wires them); features can
trigger export and deletion programmatically today.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from theourgia.core.gdpr.deletion import (
    DeletionContext,
    DeletionRegistry,
    DeletionReport,
    default_deletion_registry,
)
from theourgia.core.gdpr.export import (
    ExportContext,
    ExportRegistry,
    default_export_registry,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["GDPRService"]

_log = logging.getLogger(__name__)


class GDPRService:
    """Orchestrates per-feature exporters and deletion handlers."""

    def __init__(
        self,
        *,
        export_registry: ExportRegistry | None = None,
        deletion_registry: DeletionRegistry | None = None,
    ) -> None:
        self._export_registry = export_registry or default_export_registry
        self._deletion_registry = (
            deletion_registry or default_deletion_registry
        )

    # ── Export ───────────────────────────────────────────────────────

    async def export_user_data(
        self,
        *,
        user_id: UUID,
        db_session: "AsyncSession | None" = None,
        request_id: str | None = None,
    ) -> dict[str, object]:
        """Return a JSON-serializable archive of everything Theourgia
        stores for ``user_id``.

        Shape::

            {
                "schema_version": 1,
                "user_id": "<uuid>",
                "exported_at": "2026-06-21T12:00:00+00:00",
                "features": {
                    "journal": {...},
                    "divination": {...},
                    "sigils": {...},
                    ...
                },
                "missing_features": []
            }

        Failures in individual exporters do NOT short-circuit the
        whole export. The feature's slot in ``features`` becomes
        ``None`` and its name appears in ``missing_features`` so the
        user can see what couldn't be retrieved.
        """
        context = ExportContext(
            user_id=user_id, db_session=db_session, request_id=request_id
        )

        features_data: dict[str, object] = {}
        missing: list[str] = []

        for feature in self._export_registry.all_features():
            exporter = self._export_registry.get(feature)
            try:
                features_data[feature] = await exporter(context)
            except Exception as exc:  # noqa: BLE001 — never lose the whole archive
                _log.warning(
                    "gdpr.export.feature_failed",
                    extra={
                        "feature": feature,
                        "user_id": str(user_id),
                        "error": str(exc),
                    },
                )
                features_data[feature] = None
                missing.append(feature)

        return {
            "schema_version": 1,
            "user_id": str(user_id),
            "exported_at": datetime.now(tz=UTC).isoformat(),
            "features": features_data,
            "missing_features": missing,
        }

    def registered_export_features(self) -> list[str]:
        return self._export_registry.all_features()

    # ── Deletion ─────────────────────────────────────────────────────

    async def delete_user_data(
        self,
        *,
        user_id: UUID,
        db_session: "AsyncSession | None" = None,
        request_id: str | None = None,
    ) -> list[DeletionReport]:
        """Run every registered deletion handler against ``user_id``.

        Returns the list of per-feature reports. A handler that
        raises produces a synthetic "failed" report — the deletion
        does not short-circuit; the operator manually intervenes for
        the failed features and re-runs.

        The caller is responsible for the surrounding transaction.
        Most handlers expect ``db_session`` and modify rows; the
        caller commits at the end."""
        context = DeletionContext(
            user_id=user_id, db_session=db_session, request_id=request_id
        )
        reports: list[DeletionReport] = []
        for feature in self._deletion_registry.all_features():
            handler = self._deletion_registry.get(feature)
            try:
                report = await handler(context)
            except Exception as exc:  # noqa: BLE001
                _log.warning(
                    "gdpr.deletion.feature_failed",
                    extra={
                        "feature": feature,
                        "user_id": str(user_id),
                        "error": str(exc),
                    },
                )
                report = DeletionReport(
                    feature=feature,
                    notes=f"deletion handler raised: {exc.__class__.__name__}",
                )
            reports.append(report)
        return reports

    def registered_deletion_features(self) -> list[str]:
        return self._deletion_registry.all_features()

    # ── Audit summary ────────────────────────────────────────────────

    def coverage_audit(self) -> dict[str, list[str]]:
        """Return features registered for export but missing deletion
        (and vice versa). Used by the foundation-audit pass."""
        export_features = set(self._export_registry.all_features())
        deletion_features = set(self._deletion_registry.all_features())
        return {
            "export_only": sorted(export_features - deletion_features),
            "deletion_only": sorted(deletion_features - export_features),
            "both": sorted(export_features & deletion_features),
        }
