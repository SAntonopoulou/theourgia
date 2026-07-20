"""The six shipped agent definitions — registry + tone regression.

Rule 54: every shipped system prompt embeds the non-oracular rule
verbatim; the regression here fails the moment a prompt edit drops
or dilutes it.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.agents.definitions import (
    AGENT_DEFINITIONS,
    NON_ORACULAR_RULE,
    is_known_kind,
    resolve_definition,
)
from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.installs import engine_dependency
from theourgia_agent.api.routers.runs import control_token_dependency
from theourgia_agent.mcp.capabilities import (
    CAPABILITY_KIND_READ,
    capability_kind,
)

EXPECTED_KINDS = {
    "divination-companion",
    "scrying-journal-partner",
    "ritual-aide",
    "study-tutor",
    "correspondence-research-helper",
    "synchronicity-reviewer",
}


def test_registry_ships_exactly_six_kinds() -> None:
    assert {d.kind for d in AGENT_DEFINITIONS} == EXPECTED_KINDS
    assert len(AGENT_DEFINITIONS) == 6


def test_every_prompt_contains_the_non_oracular_rule() -> None:
    """REGRESSION (rule 54): the phrase-level rule is verbatim in each
    shipped prompt — editing it out must fail the suite."""
    for d in AGENT_DEFINITIONS:
        assert NON_ORACULAR_RULE in d.system_prompt, d.kind
        assert "no divinatory authority" in d.system_prompt.casefold(), d.kind


def test_non_oracular_rule_bans_the_digest_phrases() -> None:
    """The rule text carries the same banned framings the analytics
    digest enforces (destiny / fated / the gods favor / must)."""
    lowered = NON_ORACULAR_RULE.casefold()
    for phrase in ("destiny", "fated", "the gods favor", "you must"):
        assert phrase in lowered, phrase


def test_default_capabilities_are_read_only() -> None:
    for d in AGENT_DEFINITIONS:
        assert d.default_capabilities, d.kind
        for cap in d.default_capabilities:
            assert capability_kind(cap) == CAPABILITY_KIND_READ, (
                f"{d.kind} defaults must be read-only, got {cap.value}"
            )


def test_suggested_models_are_known_tiers() -> None:
    for d in AGENT_DEFINITIONS:
        assert d.suggested_model in ("opus", "sonnet", "haiku"), d.kind


def test_resolve_definition_normalises_and_rejects_unknown() -> None:
    assert resolve_definition("Study-Tutor ") is not None
    assert resolve_definition("study-tutor").kind == "study-tutor"
    assert resolve_definition("my-custom-agent") is None
    assert is_known_kind("ritual-aide")
    assert not is_known_kind("reviewer")


def test_display_names_and_prompts_are_nonempty() -> None:
    for d in AGENT_DEFINITIONS:
        assert d.display_name.strip()
        assert len(d.system_prompt) > len(NON_ORACULAR_RULE)


# ── install endpoint: known kinds canonicalised, custom kept ─────────


def _make_app(daemon_engine: AsyncEngine):
    app = create_app()
    app.dependency_overrides[engine_dependency] = lambda: daemon_engine
    app.dependency_overrides[control_token_dependency] = lambda: None
    return app


def _create_body(**overrides) -> dict:
    defaults = dict(
        vault_id="vault-1",
        agent_id="example-agent",
        display_name="Example",
        kind="reviewer",
        monthly_cost_cap_usd="10.00",
    )
    defaults.update(overrides)
    return defaults


@pytest.mark.asyncio
async def test_install_accepts_known_kind_and_canonicalises(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.post(
            "/installs",
            json=_create_body(kind="Divination-Companion"),
        )
    assert response.status_code == 201
    assert response.json()["kind"] == "divination-companion"


@pytest.mark.asyncio
async def test_install_keeps_accepting_free_string_custom_kinds(
    daemon_engine: AsyncEngine,
) -> None:
    """Back-compat: unknown kinds are CUSTOM kinds, not errors."""
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.post(
            "/installs",
            json=_create_body(kind="my-bespoke-helper"),
        )
    assert response.status_code == 201
    assert response.json()["kind"] == "my-bespoke-helper"
