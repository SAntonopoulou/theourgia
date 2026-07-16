"""Baseline instance settings registered at app start.

The minimum set of operator toggles every Theourgia install supports.
Features add their own keys via their own ``register()`` functions.
"""

from __future__ import annotations

from theourgia.core.instancesettings.registry import (
    InstanceSettingsRegistry,
    default_instance_settings_registry,
    register_instance_setting,
)

__all__ = ["register_default_instance_settings"]


def register_default_instance_settings(
    registry: InstanceSettingsRegistry | None = None,
) -> None:
    """Install the baseline instance-setting definitions.

    **Idempotent** — safe to call multiple times. Tests that need an
    isolated registry pass their own; production uses
    :data:`default_instance_settings_registry`.
    """
    target = registry or default_instance_settings_registry
    if target.has("registration.open"):
        return

    # ── Registration / account creation ──────────────────────────────
    register_instance_setting(
        "registration.open",
        value_type=bool,
        default=True,
        public=True,  # signup page reads this without auth
        description=(
            "Whether new accounts can sign up. When False, the signup "
            "endpoint refuses; existing users keep working normally."
        ),
        registry=target,
    )
    register_instance_setting(
        "registration.invite_only",
        value_type=bool,
        default=False,
        public=True,
        description=(
            "When True, signup requires an invitation token. Has no "
            "effect when registration.open is False."
        ),
        registry=target,
    )

    # ── Homepage / public surface ────────────────────────────────────
    register_instance_setting(
        "homepage.welcome_message",
        value_type=str,
        default="",
        public=True,
        description=(
            "Operator-customizable welcome message rendered on the "
            "public landing page. Empty = render Theourgia's stock "
            "intro."
        ),
        registry=target,
    )
    register_instance_setting(
        "homepage.show_divinations_preview",
        value_type=bool,
        default=False,
        public=True,
        description=(
            "Show a preview of recent PUBLIC divinations on the "
            "landing page. Off by default — practitioners often "
            "prefer obscurity."
        ),
        registry=target,
    )

    # ── Federation ───────────────────────────────────────────────────
    register_instance_setting(
        "federation.enabled",
        value_type=bool,
        default=False,
        public=True,
        description=(
            "Master toggle for federation. When False, this instance "
            "neither publishes outbound nor accepts inbound from peers."
        ),
        registry=target,
    )
    register_instance_setting(
        "federation.accept_anonymous_inbound",
        value_type=bool,
        default=False,
        description=(
            "Whether unsigned inbound federation requests are accepted. "
            "Off by default — federation should always be signed."
        ),
        registry=target,
    )

    # ── AI agent ─────────────────────────────────────────────────────
    register_instance_setting(
        "agent.allowed",
        value_type=bool,
        default=False,
        public=True,
        description=(
            "Instance-wide toggle for the daskalos AI agent. When "
            "False, users cannot enable agent.enabled (S10) regardless "
            "of their own setting. When True, individual users decide. "
            "Off by default — operators opt the instance in."
        ),
        registry=target,
    )

    # ── Plugins ──────────────────────────────────────────────────────
    register_instance_setting(
        "plugins.third_party_install_allowed",
        value_type=bool,
        default=False,
        description=(
            "Whether users can install third-party plugins (anything "
            "not in the official registry). Off by default; operators "
            "opt in for power-user instances."
        ),
        registry=target,
    )

    # ── Content / cultural sensitivity ───────────────────────────────
    register_instance_setting(
        "content.closed_tradition_slugs",
        value_type=str,
        default="",
        description=(
            "Operator-curated, comma-separated list of closed-tradition "
            "slugs (for example active indigenous practices whose "
            "communities do not share their material publicly). Content "
            "whose tradition_tags match a listed slug is hard-blocked "
            "from public visibility and excluded from AI agent access. "
            "Empty by default — which traditions are closed is a "
            "judgement each operator makes for their community."
        ),
        registry=target,
    )

    # ── Backups / maintenance ────────────────────────────────────────
    register_instance_setting(
        "maintenance.mode",
        value_type=bool,
        default=False,
        public=True,
        description=(
            "When True, the API returns 503 with a maintenance "
            "message for all non-admin requests. Used during upgrades "
            "/ migrations."
        ),
        registry=target,
    )
    register_instance_setting(
        "maintenance.message",
        value_type=str,
        default="Theourgia is undergoing maintenance.",
        public=True,
        description=(
            "Message displayed when maintenance.mode is True."
        ),
        registry=target,
    )
