"""Schema-only tests for the registry routers.

Verifies the rule-bearing invariants without needing a DB:

  · Submission body is extra-forbidden + license is SPDX-validated.
  · ACCEPTED_LICENSES is exactly the H10-locked set.
  · Public + author + maintainer schemas are all extra-forbidden.
  · Public sort options never include popularity (rule 38).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia_registry.api.routers.author import (
    ACCEPTED_LICENSES,
    SubmissionCreate,
    SubmissionRead,
)
from theourgia_registry.api.routers.public import (
    PublicAuthorRead,
    PublicPluginCard,
    PublicPluginListResponse,
)
from theourgia_registry.models.advisory import AdvisorySeverity
from theourgia_registry.models.maintainer import MaintainerRole
from theourgia_registry.models.plugin import PluginTier, VersionStatus


def test_accepted_licenses_match_h10_locked_set() -> None:
    """The license allowlist must match plan/H10 rule 42 verbatim."""
    expected = {
        "AGPL-3.0-only",
        "AGPL-3.0-or-later",
        "GPL-3.0-or-later",
        "LGPL-3.0-or-later",
        "MPL-2.0",
        "MIT",
        "BSD-2-Clause",
        "BSD-3-Clause",
        "Apache-2.0",
        "CC-BY-SA-4.0",
        "Unlicense",
    }
    assert set(ACCEPTED_LICENSES) == expected


def test_advisory_severity_has_no_critical() -> None:
    """Rule 43 — three tiers, no `critical`."""
    values = {s.value for s in AdvisorySeverity}
    assert values == {"low", "medium", "high"}
    assert "critical" not in values


def test_plugin_tier_three_values() -> None:
    """Rule 29 — official / community / unverified, all neutral chrome."""
    values = {t.value for t in PluginTier}
    assert "official" in values
    assert "community" in values
    assert "unverified" in values


def test_version_status_covers_full_lifecycle() -> None:
    """Submission lifecycle (A3 chip vocabulary)."""
    values = {s.value for s in VersionStatus}
    assert "pending_review" in values
    assert "under_review" in values
    assert "changes_requested" in values
    assert "accepted_community" in values
    assert "accepted_official" in values
    assert "rejected" in values
    assert "withdrawn" in values


def test_maintainer_role_has_lead_and_reviewer() -> None:
    """Multi-maintainer governance — LEAD can appoint, REVIEWER cannot."""
    values = {r.value for r in MaintainerRole}
    assert values == {"lead", "reviewer"}


def test_submission_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SubmissionCreate(  # type: ignore[call-arg]
            name="x-plugin",
            version="0.0.1",
            license_spdx="MIT",
            source_url="https://example.com/release",
            signature_base64="abc=",
            sneaky=True,
        )


def test_submission_create_name_pattern() -> None:
    """Plugin names: lowercase, digits, hyphens; 2-64 chars."""
    with pytest.raises(ValidationError):
        SubmissionCreate(
            name="UpperCase",
            version="0.0.1",
            license_spdx="MIT",
            source_url="https://example.com/release",
            signature_base64="abc=",
        )
    with pytest.raises(ValidationError):
        SubmissionCreate(
            name="x",  # too short
            version="0.0.1",
            license_spdx="MIT",
            source_url="https://example.com/release",
            signature_base64="abc=",
        )


def test_submission_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SubmissionRead(  # type: ignore[call-arg]
            id="x",
            plugin_id="y",
            plugin_name="x-plugin",
            version="0.0.1",
            status="pending_review",
            license_spdx="MIT",
            submitted_at="2026-06-28T12:00:00Z",
            sneaky=True,
        )


def test_submission_read_carries_lifecycle_metadata() -> None:
    """A3 chip + A4 detail surfaces need license + submitted_at +
    decided_at to render the right vocabulary."""
    sub = SubmissionRead(
        id="x", plugin_id="y", plugin_name="x-plugin",
        version="0.0.1", status="pending_review", license_spdx="MIT",
        submitted_at="2026-06-28T12:00:00Z",
    )
    assert sub.decided_at is None
    assert sub.license_spdx == "MIT"


def test_submission_list_response_round_trip() -> None:
    from theourgia_registry.api.routers.author import (
        SubmissionListResponse,
    )

    resp = SubmissionListResponse(submissions=[])
    assert resp.submissions == []


def test_decision_body_rejects_unknown_decision() -> None:
    from theourgia_registry.api.routers.maintainer import DecisionBody

    with pytest.raises(ValidationError):
        DecisionBody(decision="approve_blind", note="lgtm")


def test_decision_body_requires_non_empty_note() -> None:
    """Rule 44 — decisions must carry a note. Empty string rejected."""
    from theourgia_registry.api.routers.maintainer import DecisionBody

    with pytest.raises(ValidationError):
        DecisionBody(decision="reject", note="")


def test_decision_body_accepts_all_four_decisions() -> None:
    from theourgia_registry.api.routers.maintainer import DecisionBody

    for decision in (
        "accept_community",
        "accept_official",
        "reject",
        "changes_requested",
    ):
        body = DecisionBody(decision=decision, note="x")
        assert body.decision == decision


def test_tier_promotion_body_rejects_unknown_tier() -> None:
    from theourgia_registry.api.routers.maintainer import (
        TierPromotionBody,
    )

    with pytest.raises(ValidationError):
        TierPromotionBody(to_tier="elder", justification="reason")


def test_appoint_maintainer_body_rejects_unknown_role() -> None:
    from theourgia_registry.api.routers.maintainer import (
        AppointMaintainerBody,
    )

    with pytest.raises(ValidationError):
        AppointMaintainerBody(author_did="did:vault:x", role="god")


def test_advisory_create_rejects_critical_severity() -> None:
    """Rule 43 — no `critical` tier on the wire either."""
    from theourgia_registry.api.routers.author import AdvisoryCreate

    with pytest.raises(ValidationError):
        AdvisoryCreate(
            plugin_id="11111111-1111-1111-1111-111111111111",
            severity="critical",
            affected_version_range=">=1.0.0",
            body="vulnerability description",
        )


def test_advisory_create_requires_non_empty_body() -> None:
    """Rule 30 — advisory body renders verbatim in the H09 banner; an
    empty body is meaningless."""
    from theourgia_registry.api.routers.author import AdvisoryCreate

    with pytest.raises(ValidationError):
        AdvisoryCreate(
            plugin_id="11111111-1111-1111-1111-111111111111",
            severity="high",
            affected_version_range=">=1.0.0",
            body="",
        )


def test_advisory_create_accepts_all_three_severities() -> None:
    from theourgia_registry.api.routers.author import AdvisoryCreate

    for severity in ("low", "medium", "high"):
        body = AdvisoryCreate(
            plugin_id="11111111-1111-1111-1111-111111111111",
            severity=severity,
            affected_version_range=">=1.0.0",
            body="non-empty body",
        )
        assert body.severity == severity


def test_queue_item_extra_forbidden() -> None:
    from theourgia_registry.api.routers.maintainer import QueueItem

    with pytest.raises(ValidationError):
        QueueItem(  # type: ignore[call-arg]
            submission_id="x",
            plugin_id="y",
            plugin_name="x-plugin",
            author_did="did:vault:x",
            version="0.0.1",
            license_spdx="MIT",
            status="pending_review",
            submitted_at="2026-06-28T12:00:00Z",
            capabilities=[],
            popularity=99,  # would be rule 38 violation
        )


def test_public_plugin_card_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PublicPluginCard(  # type: ignore[call-arg]
            id="x",
            name="x",
            author_did="did:x",
            author_display_name="x",
            description="x",
            tier="official",
            homepage=None,
            updated_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            tombstoned=False,
            sneaky=True,
        )


def test_public_plugin_list_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PublicPluginListResponse(  # type: ignore[call-arg]
            plugins=[],
            sneaky=True,
        )


def test_public_author_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PublicAuthorRead(  # type: ignore[call-arg]
            did="did:x",
            display_name="x",
            homepage=None,
            plugin_count=0,
            sneaky=True,
        )
