"""Extension points where plugins attach functionality.

Each extension point is a hook the host application surfaces and that
plugins may register implementations against. The point is identified
by a string slug (used in manifests) and an enum value (used in code).

A plugin manifest declares which extension points it provides
implementations for; the loader validates that the declared points
exist (so typos in the manifest fail loudly at install time, not
silently at runtime).

The set of extension points is intentionally finite and curated.
Adding one is a small architectural decision and warrants an ADR —
because a stable plugin SDK requires stable extension points.
"""

from __future__ import annotations

import enum

__all__ = ["ExtensionPoint"]


class ExtensionPoint(str, enum.Enum):
    """A named place plugins attach themselves.

    Each value is a dotted slug; the leading segment groups by domain
    for discoverability (``calendar.``, ``divination.``, ``ui.``, …).
    """

    # ── Time & cosmology ─────────────────────────────────────────────
    CALENDAR = "calendar.system"
    """A new calendar system (e.g., a tradition-specific calendar)."""

    ASTROLOGY_TECHNIQUE = "astrology.technique"
    """A new dignity scheme, time-lord technique, or chart-interpretation engine."""

    ELECTION_SCORER = "astrology.election_scorer"
    """A custom scoring function for the election finder."""

    # ── Divination ───────────────────────────────────────────────────
    DIVINATION_SYSTEM = "divination.system"
    """A new divination system beyond the bundled set."""

    TAROT_DECK_LOADER = "divination.tarot.deck_loader"
    """A loader for tarot decks from a non-standard format."""

    # ── Linguistic ───────────────────────────────────────────────────
    CIPHER = "linguistic.cipher"
    """A gematria / isopsephy cipher."""

    TRANSLITERATION_SCHEME = "linguistic.transliteration"
    """A script-to-Latin transliteration scheme."""

    # ── Correspondences & reference ──────────────────────────────────
    CORRESPONDENCE_TABLE = "reference.correspondence_table"
    """A default-loadable correspondence table (e.g., Liber 777)."""

    # ── Workshop ─────────────────────────────────────────────────────
    SIGIL_MODE = "workshop.sigil_mode"
    """A new sigil generation algorithm."""

    # ── Editor / UI ──────────────────────────────────────────────────
    EDITOR_BLOCK = "ui.editor.block"
    """A Tiptap node type for the rich-text editor."""

    ENTRY_KIND = "journal.entry_kind"
    """A new journal entry kind with its own schema and renderer."""

    DASHBOARD_WIDGET = "ui.dashboard.widget"
    """A home-dashboard widget."""

    ANALYTICS_CHART = "ui.analytics.chart"
    """A custom visualization for the analytics dashboard."""

    SETTINGS_PAGE = "ui.settings.page"
    """A plugin-provided settings page."""

    # ── Integrations ─────────────────────────────────────────────────
    NOTIFICATION_CHANNEL = "integration.notification_channel"
    """A new delivery mechanism for notifications (Matrix, Signal, ntfy…)."""

    EXPORTER = "integration.exporter"
    """A new output format for entries / journals / bundles."""

    IMPORTER = "integration.importer"
    """A new input format (e.g., from another journaling tool)."""

    AUTH_PROVIDER = "integration.auth_provider"
    """An OAuth/OIDC identity provider."""

    STORAGE_BACKEND = "integration.storage_backend"
    """An object-storage adapter (S3-compatible variants, sftp, etc.)."""

    EMAIL_BACKEND = "integration.email_backend"
    """An email-sending adapter (SMTP, Postmark, SES, Resend, Mailgun, …)."""

    # ── Federation & AP ──────────────────────────────────────────────
    FEDERATION_MESSAGE_TYPE = "federation.message_type"
    """A new Theourgia federation event kind."""

    ACTIVITYPUB_OBJECT_TYPE = "federation.activitypub.object_type"
    """A new ActivityPub object or activity type."""

    @classmethod
    def from_string(cls, value: str) -> "ExtensionPoint":
        """Parse an extension-point slug into the enum, raising on unknown."""
        try:
            return cls(value)
        except ValueError as exc:
            msg = f"unknown extension point: {value!r}"
            raise ValueError(msg) from exc
