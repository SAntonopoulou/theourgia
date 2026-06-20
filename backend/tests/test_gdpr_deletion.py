"""Tests for the GDPR deletion registry + service."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.gdpr.deletion import (
    DeletionContext,
    DeletionRegistry,
    DeletionReport,
    register_deletion_handler,
)
from theourgia.core.gdpr.service import GDPRService


@pytest.fixture
def deletion_registry() -> DeletionRegistry:
    return DeletionRegistry()


# ── Registry ─────────────────────────────────────────────────────────


def test_register_and_get(deletion_registry: DeletionRegistry) -> None:
    async def handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="x", rows_deleted=1)

    deletion_registry.register(handler, feature="journal")
    assert deletion_registry.has("journal")


def test_duplicate_handler_rejected(deletion_registry: DeletionRegistry) -> None:
    async def handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="x")

    deletion_registry.register(handler, feature="journal")
    with pytest.raises(ValueError, match="already registered"):
        deletion_registry.register(handler, feature="journal")


def test_empty_feature_name_rejected(deletion_registry: DeletionRegistry) -> None:
    async def handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="x")

    with pytest.raises(ValueError, match="feature"):
        deletion_registry.register(handler, feature="")


def test_register_deletion_handler_helper(
    deletion_registry: DeletionRegistry,
) -> None:
    async def handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="x")

    register_deletion_handler("journal", handler, registry=deletion_registry)
    assert deletion_registry.has("journal")


# ── GDPRService.delete_user_data ─────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_invokes_every_handler(
    deletion_registry: DeletionRegistry,
) -> None:
    async def journal_handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="journal", rows_deleted=12)

    async def sigils_handler(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="sigils", rows_anonymized=3)

    deletion_registry.register(journal_handler, feature="journal")
    deletion_registry.register(sigils_handler, feature="sigils")

    service = GDPRService(deletion_registry=deletion_registry)
    reports = await service.delete_user_data(user_id=uuid4())
    assert len(reports) == 2
    by_feature = {r.feature: r for r in reports}
    assert by_feature["journal"].rows_deleted == 12
    assert by_feature["sigils"].rows_anonymized == 3


@pytest.mark.asyncio
async def test_delete_continues_on_handler_failure(
    deletion_registry: DeletionRegistry,
) -> None:
    """A failing handler doesn't stop subsequent handlers — operator
    can re-run for failed features individually."""

    async def working(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="journal", rows_deleted=5)

    async def broken(ctx: DeletionContext) -> DeletionReport:
        raise RuntimeError("upstream is down")

    async def also_working(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="entities", rows_deleted=2)

    deletion_registry.register(working, feature="journal")
    deletion_registry.register(broken, feature="sigils")
    deletion_registry.register(also_working, feature="entities")

    service = GDPRService(deletion_registry=deletion_registry)
    reports = await service.delete_user_data(user_id=uuid4())
    assert len(reports) == 3
    by_feature = {r.feature: r for r in reports}
    assert by_feature["journal"].rows_deleted == 5
    assert "RuntimeError" in by_feature["sigils"].notes
    assert by_feature["entities"].rows_deleted == 2


@pytest.mark.asyncio
async def test_delete_with_no_handlers_is_noop() -> None:
    service = GDPRService(deletion_registry=DeletionRegistry())
    reports = await service.delete_user_data(user_id=uuid4())
    assert reports == []


@pytest.mark.asyncio
async def test_coverage_audit_identifies_gaps() -> None:
    """The audit helper surfaces features registered for export but
    not deletion, and vice versa — used by the foundation audit pass."""
    from theourgia.core.gdpr.export import ExportContext, ExportRegistry

    exports = ExportRegistry()
    deletions = DeletionRegistry()

    async def exp(ctx: ExportContext):
        return {}

    async def hdl(ctx: DeletionContext) -> DeletionReport:
        return DeletionReport(feature="x")

    # journal: in both
    exports.register(exp, feature="journal")
    deletions.register(hdl, feature="journal")
    # entities: export only (BUG — missing deletion)
    exports.register(exp, feature="entities")
    # webauthn: deletion only (handled by account deletion before GDPR
    # would touch it — known acceptable gap)
    deletions.register(hdl, feature="webauthn")

    service = GDPRService(
        export_registry=exports, deletion_registry=deletions
    )
    audit = service.coverage_audit()
    assert audit["export_only"] == ["entities"]
    assert audit["deletion_only"] == ["webauthn"]
    assert audit["both"] == ["journal"]
