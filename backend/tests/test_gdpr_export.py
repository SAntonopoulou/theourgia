"""Tests for the GDPR export registry + service."""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from theourgia.core.gdpr.export import (
    ExportContext,
    ExportRegistry,
    register_exporter,
)
from theourgia.core.gdpr.service import GDPRService


@pytest.fixture
def export_registry() -> ExportRegistry:
    return ExportRegistry()


async def _make_exporter(payload):
    async def _exp(ctx: ExportContext):
        return payload
    return _exp


# ── Registry ─────────────────────────────────────────────────────────


def test_register_and_get() -> None:
    r = ExportRegistry()

    async def exporter(ctx: ExportContext):
        return {}

    r.register(exporter, feature="journal", description="Journal entries")
    assert r.has("journal")
    assert r.description("journal") == "Journal entries"


def test_duplicate_registration_rejected() -> None:
    r = ExportRegistry()

    async def exporter(ctx: ExportContext):
        return {}

    r.register(exporter, feature="journal")
    with pytest.raises(ValueError, match="already registered"):
        r.register(exporter, feature="journal")


def test_empty_feature_name_rejected() -> None:
    r = ExportRegistry()

    async def exporter(ctx: ExportContext):
        return {}

    with pytest.raises(ValueError, match="feature"):
        r.register(exporter, feature="")


def test_register_exporter_helper(export_registry: ExportRegistry) -> None:
    async def exporter(ctx: ExportContext):
        return {}

    register_exporter("journal", exporter, registry=export_registry)
    assert export_registry.has("journal")


def test_all_features_returns_registered() -> None:
    r = ExportRegistry()

    async def exporter(ctx: ExportContext):
        return {}

    r.register(exporter, feature="journal")
    r.register(exporter, feature="divination")
    assert set(r.all_features()) == {"journal", "divination"}


def test_get_missing_raises_keyerror() -> None:
    r = ExportRegistry()
    with pytest.raises(KeyError, match="no exporter"):
        r.get("nope")


# ── GDPRService.export_user_data ─────────────────────────────────────


@pytest.mark.asyncio
async def test_export_assembles_per_feature_shards(
    export_registry: ExportRegistry,
) -> None:
    async def journal_exporter(ctx: ExportContext):
        return {"entries": [{"id": "1", "body": "hello"}]}

    async def divination_exporter(ctx: ExportContext):
        return {"tarot_draws": []}

    export_registry.register(journal_exporter, feature="journal")
    export_registry.register(divination_exporter, feature="divination")

    service = GDPRService(export_registry=export_registry)
    archive = await service.export_user_data(user_id=uuid4())

    assert archive["schema_version"] == 1
    assert "exported_at" in archive
    assert "journal" in archive["features"]
    assert "divination" in archive["features"]
    assert archive["features"]["journal"] == {"entries": [{"id": "1", "body": "hello"}]}
    assert archive["missing_features"] == []


@pytest.mark.asyncio
async def test_export_handles_failing_exporter_gracefully(
    export_registry: ExportRegistry,
) -> None:
    """One bad exporter must not lose the whole archive."""

    async def working(ctx: ExportContext):
        return {"ok": True}

    async def broken(ctx: ExportContext):
        raise RuntimeError("simulated failure")

    export_registry.register(working, feature="journal")
    export_registry.register(broken, feature="sigils")

    service = GDPRService(export_registry=export_registry)
    archive = await service.export_user_data(user_id=uuid4())

    assert archive["features"]["journal"] == {"ok": True}
    assert archive["features"]["sigils"] is None
    assert "sigils" in archive["missing_features"]


@pytest.mark.asyncio
async def test_export_empty_when_no_exporters() -> None:
    service = GDPRService(export_registry=ExportRegistry())
    archive = await service.export_user_data(user_id=uuid4())
    assert archive["features"] == {}
    assert archive["missing_features"] == []


@pytest.mark.asyncio
async def test_export_context_carries_user_id(
    export_registry: ExportRegistry,
) -> None:
    captured: dict[str, UUID] = {}

    async def exporter(ctx: ExportContext):
        captured["user_id"] = ctx.user_id
        return {}

    export_registry.register(exporter, feature="x")
    service = GDPRService(export_registry=export_registry)
    uid = uuid4()
    await service.export_user_data(user_id=uid)
    assert captured["user_id"] == uid
