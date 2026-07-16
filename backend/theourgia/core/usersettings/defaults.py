"""Built-in settings — UI / accessibility / locale defaults.

The minimum set of preferences every Theourgia install supports out
of the box. Features (and plugins) register their own keys on top of
these.

Registered automatically on app startup via :func:`register_default_settings`.
The frontend's settings UI in Phase 02 renders the union of this set
plus whatever per-feature keys have been registered.
"""

from __future__ import annotations

from theourgia.core.usersettings.registry import (
    SettingsRegistry,
    default_settings_registry,
    register_setting,
)

__all__ = ["register_default_settings"]


def register_default_settings(
    registry: SettingsRegistry | None = None,
) -> None:
    """Install the baseline per-user setting definitions.

    **Idempotent** — safe to call multiple times. If a baseline key
    is already present (e.g. a test reused the default registry, or
    multiple workers each ran startup), the function returns early
    without re-registering anything.

    Tests that need an isolated registry pass their own; production
    uses :data:`default_settings_registry`.
    """
    target = registry or default_settings_registry

    # Short-circuit when the baseline has already been installed
    if target.has("ui.theme"):
        return

    # ── UI / appearance ──────────────────────────────────────────────
    register_setting(
        "ui.theme",
        value_type=str,
        default="auto",
        description="Light, dark, or auto (follows system).",
        allowed_values=("light", "dark", "auto"),
        registry=target,
    )
    register_setting(
        "ui.density",
        value_type=str,
        default="comfortable",
        description="Layout density — comfortable, compact, or spacious.",
        allowed_values=("comfortable", "compact", "spacious"),
        registry=target,
    )
    register_setting(
        "ui.sidebar.position",
        value_type=str,
        default="left",
        description="Where the navigation sidebar sits.",
        allowed_values=("left", "right"),
        registry=target,
    )
    register_setting(
        "ui.sidebar.collapsed",
        value_type=bool,
        default=False,
        description="Whether the sidebar starts collapsed.",
        registry=target,
    )

    # ── Accessibility ────────────────────────────────────────────────
    register_setting(
        "a11y.reduce_motion",
        value_type=bool,
        default=False,
        description=(
            "Reduce or remove non-essential animations. Mirrors "
            "prefers-reduced-motion when unset."
        ),
        registry=target,
    )
    register_setting(
        "a11y.high_contrast",
        value_type=bool,
        default=False,
        description="Increase contrast across the interface.",
        registry=target,
    )
    register_setting(
        "a11y.font_size_scale",
        value_type=float,
        default=1.0,
        description="Multiplier on base font size (1.0 = default).",
        min_value=0.75,
        max_value=2.0,
        registry=target,
    )

    # ── Wellbeing (v1-010, opt-in — OFF by default) ──────────────────
    # Maps to the frontend "Crisis-aware nudge" toggle on the
    # AccessibilityAndMotion surface (prefs key ``crisisNudge``); hence
    # the a11y namespace. Project rule: the user chooses whether this
    # care exists — never default it on.
    register_setting(
        "a11y.crisis_nudge",
        value_type=bool,
        default=False,
        description=(
            "Opt-in crisis-aware nudge. When on, Theourgia may show a "
            "single quiet dismissible note pointing at support "
            "resources. Off by default."
        ),
        registry=target,
    )
    register_setting(
        "a11y.crisis_nudge_muted_until",
        value_type=str,
        default="",
        description=(
            "Nudge mute horizon: empty (not muted), an ISO date "
            "(muted through that day), or 'forever' (muted "
            "indefinitely — the user is never nagged)."
        ),
        registry=target,
    )

    # ── Locale / time ────────────────────────────────────────────────
    register_setting(
        "i18n.locale_override",
        value_type=str,
        default="",
        description=(
            "Explicit locale override (empty = use Accept-Language). "
            "Must match a supported locale per "
            "THEOURGIA_SUPPORTED_LOCALES."
        ),
        registry=target,
    )
    register_setting(
        "i18n.timezone",
        value_type=str,
        default="UTC",
        description="IANA timezone name for displaying dates.",
        registry=target,
    )

    # ── Calendars (v1-016 — the setup wizard's multi-select) ─────────
    register_setting(
        "calendars.enabled",
        value_type=list,
        default=["gregorian", "julian", "hebrew", "thelemic"],
        description=(
            "Calendar ids shown on the dashboard and stamped onto new "
            "entries (JSON list). Gregorian, Julian, Hebrew, and "
            "Thelemic are always stamped; ids listed here add the "
            "optional calendars (islamic, coptic, mayan, "
            "french-republican, plugin-provided)."
        ),
        registry=target,
    )

    # ── Editor (Phase 04+ but the key exists from day one) ───────────
    register_setting(
        "editor.font_family",
        value_type=str,
        default="serif",
        description="Font family the entry editor uses.",
        registry=target,
    )
    register_setting(
        "editor.autosave_seconds",
        value_type=int,
        default=15,
        description="Seconds between autosaves while editing.",
        min_value=5,
        max_value=300,
        registry=target,
    )
    register_setting(
        "editor.spellcheck",
        value_type=bool,
        default=True,
        description="Browser-side spellcheck in the editor.",
        registry=target,
    )

    # ── Notifications (overrides above the per-channel preferences) ─
    register_setting(
        "notifications.do_not_disturb",
        value_type=bool,
        default=False,
        description=(
            "Silence ALL notifications. Mirrors the fully_muted bit "
            "on NotificationPreferenceRow."
        ),
        registry=target,
    )

    # ── Federation / sharing ─────────────────────────────────────────
    register_setting(
        "federation.publish_default",
        value_type=str,
        default="personal",
        description=(
            "Default visibility for new entries. Can be overridden "
            "per entry."
        ),
        allowed_values=("personal", "viewer", "network", "public", "sealed"),
        registry=target,
    )

    # ── Audio (Tier 2 — local Whisper transcription) ─────────────────
    register_setting(
        "audio.transcription_opt_in",
        value_type=bool,
        default=False,
        description=(
            "Whether this user's voice recordings may be transcribed "
            "by the local Whisper engine. Off by default; runs only "
            "when the instance ALSO has THEOURGIA_TRANSCRIPTION_ENABLED "
            "set. Audio never leaves the instance either way."
        ),
        registry=target,
    )

    # ── AI agent (off by default — Theourgia ships zero-telemetry) ──
    register_setting(
        "agent.enabled",
        value_type=bool,
        default=False,
        description=(
            "Whether the daskalos AI agent is enabled for this user. "
            "Off by default; requires the user to also configure their "
            "own Anthropic API key."
        ),
        registry=target,
    )
