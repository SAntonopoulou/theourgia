"""API routers.

Routers are organized by domain. The router files attach to the
application via :func:`register_routers` in :mod:`theourgia.api.app`.

Versioned routes live under ``v1/``; unversioned (health, OpenAPI,
docs) live at the top level.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from theourgia.api.routers import health, metrics, nodeinfo, webfinger, well_known
from theourgia.api.routers.v1 import altars as v1_altars
from theourgia.api.routers.v1 import astro as v1_astro
from theourgia.api.routers.v1 import attestations as v1_attestations
from theourgia.api.routers.v1 import auth as v1_auth
from theourgia.api.routers.v1 import bibliomancy as v1_bibliomancy
from theourgia.api.routers.v1 import blog as v1_blog
from theourgia.api.routers.v1 import circles as v1_circles
from theourgia.api.routers.v1 import contracts as v1_contracts
from theourgia.api.routers.v1 import entities as v1_entities
from theourgia.api.routers.v1 import entity_aliases as v1_entity_aliases
from theourgia.api.routers.v1 import entries as v1_entries
from theourgia.api.routers.v1 import geomancy as v1_geomancy
from theourgia.api.routers.v1 import horary as v1_horary
from theourgia.api.routers.v1 import hubs as v1_hubs
from theourgia.api.routers.v1 import iching as v1_iching
from theourgia.api.routers.v1 import (
    private_viewer_grants as v1_private_viewer_grants,
)
from theourgia.api.routers.v1 import (
    group_rituals as v1_group_rituals,
)
from theourgia.api.routers.v1 import (
    federation_audit as v1_federation_audit,
)
from theourgia.api.routers.v1 import (
    hub_aggregates as v1_hub_aggregates,
)
from theourgia.api.routers.v1 import sso as v1_sso
from theourgia.api.routers.v1 import activitypub as v1_activitypub
from theourgia.api.routers.v1 import identities as v1_identities
from theourgia.api.routers.v1 import initiations as v1_initiations
from theourgia.api.routers.v1 import library as v1_library
from theourgia.api.routers.v1 import magic_squares as v1_magic_squares
from theourgia.api.routers.v1 import meta as v1_meta
from theourgia.api.routers.v1 import oaths as v1_oaths
from theourgia.api.routers.v1 import offerings as v1_offerings
from theourgia.api.routers.v1 import pendulum as v1_pendulum
from theourgia.api.routers.v1 import practice_logs as v1_practice
from theourgia.api.routers.v1 import practices as v1_practices
from theourgia.api.routers.v1 import resh as v1_resh
from theourgia.api.routers.v1 import runes as v1_runes
from theourgia.api.routers.v1 import schedule as v1_schedule
from theourgia.api.routers.v1 import scrying as v1_scrying
from theourgia.api.routers.v1 import search as v1_search
from theourgia.api.routers.v1 import servitors as v1_servitors
from theourgia.api.routers.v1 import sigils as v1_sigils
from theourgia.api.routers.v1 import talismans as v1_talismans
from theourgia.api.routers.v1 import tarot as v1_tarot
from theourgia.api.routers.v1 import templates as v1_templates
from theourgia.api.routers.v1 import today_ledger as v1_today_ledger
from theourgia.api.routers.v1 import tools as v1_tools
from theourgia.api.routers.v1 import traditions as v1_traditions
from theourgia.api.routers.v1 import user_settings as v1_user_settings
from theourgia.api.routers.v1 import voces as v1_voces
from theourgia.api.routers.v1 import weather as v1_weather
from theourgia.api.routers.v1 import ciphers as v1_ciphers
from theourgia.api.routers.v1 import gematria_search as v1_gematria_search
from theourgia.api.routers.v1 import studies as v1_studies
from theourgia.api.routers.v1 import transliteration as v1_transliteration
from theourgia.api.routers.v1 import synchronicities as v1_synchronicities
from theourgia.api.routers.v1 import analytics as v1_analytics
from theourgia.api.routers.v1 import digest as v1_digest
from theourgia.api.routers.v1 import publications as v1_publications
from theourgia.api.routers.v1 import stripe_connect as v1_stripe_connect
from theourgia.api.routers.v1 import checkout as v1_checkout
from theourgia.api.routers.v1 import stripe_webhook as v1_stripe_webhook
from theourgia.api.routers.v1 import (
    subscribers as v1_subscribers,
    subscription_tiers as v1_subscription_tiers,
)
from theourgia.api.routers.v1 import (
    newsletter_issues as v1_newsletter_issues,
)
from theourgia.api.routers.v1 import (
    public_reader as v1_public_reader,
    public_vault as v1_public_vault,
)
from theourgia.api.routers.v1 import media as v1_media
from theourgia.api.routers.v1 import media_uploads as v1_media_uploads
from theourgia.api.routers.v1 import pilgrimage_sites as v1_pilgrimage_sites
from theourgia.api.routers.v1 import ical_feed as v1_ical_feed
from theourgia.api.routers.v1 import plugins as v1_plugins
from theourgia.api.routers.v1 import sandbox as v1_sandbox
from theourgia.api.routers.v1 import bundles as v1_bundles
from theourgia.api.routers.v1 import user_account as v1_user_account
from theourgia.api.routers.v1 import user_audit as v1_user_audit
from theourgia.api.routers.v1 import user_sessions as v1_user_sessions
from theourgia.api.routers.v1 import keys as v1_keys
from theourgia.api.routers.v1 import agents as v1_agents
from theourgia.api.routers.v1 import vault_mcp as v1_vault_mcp
from theourgia.api.routers.v1 import federation_inbox as v1_federation_inbox
from theourgia.api.routers.v1 import federation_peers as v1_federation_peers
from theourgia.api.routers.v1 import activitypub_actor as ap_actor
from theourgia.api.routers.v1 import registry_bridge as v1_registry_bridge
from theourgia.api.routers.v1 import registry_author as v1_registry_author
from theourgia.api.routers.v1 import registry_maintainer as v1_registry_maintainer
from theourgia.api.routers.v1 import webauthn as v1_webauthn
from theourgia.api.routers.v1 import totp as v1_totp
from theourgia.api.routers.v1 import comments as v1_comments
from theourgia.api.routers.v1 import pilgrimage_routes as v1_pilgrimage_routes
from theourgia.api.routers.v1 import recipes as v1_recipes
from theourgia.api.routers.v1 import first_run as v1_first_run
from theourgia.api.routers.v1 import memorial as v1_memorial
from theourgia.api.routers.v1 import reference as v1_reference
from theourgia.api.routers.v1 import exports_obsidian as v1_exports_obsidian
from theourgia.api.routers.v1 import tea_leaves as v1_tea_leaves
from theourgia.api.routers.v1 import imports_day_one as v1_imports_day_one
from theourgia.api.routers.v1 import audio as v1_audio
from theourgia.api.routers.v1 import wellbeing as v1_wellbeing
from theourgia.api.routers import feeds as app_feeds

__all__ = ["register_routers"]


def register_routers(app: FastAPI) -> None:
    """Attach all routers to the app."""
    # Unversioned operational endpoints
    app.include_router(health.router, tags=["operations"])
    app.include_router(metrics.router, tags=["operations"])

    # .well-known endpoints (federation discovery, etc.)
    app.include_router(well_known.router, tags=["federation"])
    app.include_router(webfinger.router, tags=["federation"])
    app.include_router(nodeinfo.router, tags=["federation"])

    # Unversioned vault feed endpoints (RSS / Atom / JSON Feed).
    # Feed readers subscribe to stable URLs; we don't version them.
    app.include_router(app_feeds.router, tags=["feeds"])

    # Versioned API surface (v1)
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(v1_meta.router, tags=["meta"])
    v1.include_router(v1_auth.router, tags=["auth"])
    v1.include_router(v1_webauthn.router, tags=["auth"])
    v1.include_router(v1_totp.router, tags=["auth"])
    v1.include_router(v1_entries.router, tags=["entries"])
    v1.include_router(v1_traditions.router, tags=["traditions"])
    v1.include_router(v1_entities.router, tags=["entities"])
    v1.include_router(v1_library.router, tags=["library"])
    v1.include_router(v1_user_settings.router, tags=["user_settings"])
    v1.include_router(v1_astro.router, tags=["astro"])
    v1.include_router(v1_weather.router, tags=["weather"])
    v1.include_router(v1_search.router, tags=["search"])
    v1.include_router(v1_templates.router, tags=["templates"])
    v1.include_router(v1_identities.router, tags=["identities"])
    v1.include_router(v1_blog.router, tags=["blog"])
    v1.include_router(v1_schedule.router, tags=["schedule"])
    # Phase 05 ledgers
    v1.include_router(v1_offerings.router, tags=["offerings"])
    v1.include_router(v1_contracts.router, tags=["contracts"])
    v1.include_router(v1_oaths.router, tags=["oaths"])
    v1.include_router(v1_initiations.router, tags=["initiations"])
    v1.include_router(v1_servitors.router, tags=["servitors"])
    v1.include_router(v1_entity_aliases.router, tags=["entities"])
    v1.include_router(v1_attestations.router, tags=["attestations"])
    # Phase 06 divination
    v1.include_router(v1_tarot.router, tags=["tarot"])
    v1.include_router(v1_iching.router, tags=["iching"])
    v1.include_router(v1_geomancy.router, tags=["geomancy"])
    v1.include_router(v1_runes.router, tags=["runes"])
    v1.include_router(v1_pendulum.router, tags=["pendulum"])
    v1.include_router(v1_bibliomancy.router, tags=["bibliomancy"])
    v1.include_router(v1_horary.router, tags=["horary"])
    v1.include_router(v1_scrying.router, tags=["scrying"])
    v1.include_router(v1_practice.router, tags=["practice"])
    v1.include_router(v1_practices.router, tags=["practices"])
    # H01-H03 backend gap-fills
    v1.include_router(v1_resh.router, tags=["resh"])
    v1.include_router(v1_today_ledger.router, tags=["today"])
    # Phase 07 Workshop (B103+)
    v1.include_router(v1_sigils.router, tags=["sigils"])
    v1.include_router(v1_magic_squares.router, tags=["magic-squares"])
    v1.include_router(v1_talismans.router, tags=["talismans"])
    v1.include_router(v1_circles.router, tags=["circles"])
    v1.include_router(v1_tools.router, tags=["tools"])
    v1.include_router(v1_altars.router, tags=["altars"])
    v1.include_router(v1_voces.router, tags=["voces"])
    # Phase 08 Linguistic (B110+)
    v1.include_router(v1_ciphers.router, tags=["ciphers"])
    v1.include_router(v1_gematria_search.router, tags=["gematria"])
    v1.include_router(v1_studies.router, tags=["studies"])
    v1.include_router(v1_transliteration.router, tags=["transliteration"])
    # Phase 09 Synchronicity & Analytics (B120+)
    v1.include_router(
        v1_synchronicities.router, tags=["synchronicities"],
    )
    v1.include_router(v1_analytics.router, tags=["analytics"])
    v1.include_router(v1_digest.router, tags=["digest"])
    # Phase 10 Publishing (B126+)
    v1.include_router(v1_publications.router, tags=["publications"])
    v1.include_router(v1_stripe_connect.router, tags=["stripe-connect"])
    v1.include_router(v1_checkout.router, tags=["publications"])
    v1.include_router(v1_stripe_webhook.router, tags=["stripe-webhook"])
    v1.include_router(
        v1_subscription_tiers.router, tags=["subscription-tiers"],
    )
    v1.include_router(v1_subscribers.router, tags=["subscribers"])
    v1.include_router(
        v1_newsletter_issues.router, tags=["newsletter-issues"],
    )
    v1.include_router(v1_public_reader.router, tags=["public-reader"])
    v1.include_router(v1_public_vault.router, tags=["public-vault"])
    v1.include_router(v1_comments.router, tags=["comments"])
    v1.include_router(
        v1_pilgrimage_routes.router, tags=["pilgrimage-routes"],
    )
    v1.include_router(v1_recipes.router, tags=["recipes"])
    # First-run wizard (b108-2hf) — public endpoint
    v1.include_router(v1_first_run.router, tags=["setup"])
    # Memorial mode / digital inheritance (b108-2hg)
    v1.include_router(v1_memorial.router, tags=["memorial"])
    # Reference tradition data — Egyptian decans + Liber 777 (b108-2hh)
    v1.include_router(v1_reference.router, tags=["reference"])
    # Obsidian exporter (b108-2hh part 2)
    v1.include_router(v1_exports_obsidian.router, tags=["exports"])
    # Tea-leaf reading log (b108-2hj)
    v1.include_router(v1_tea_leaves.router, tags=["divination"])
    # Day One journal importer (b108-2hk)
    v1.include_router(v1_imports_day_one.router, tags=["imports"])
    # Wellbeing — crisis-aware nudge (v1-010, opt-in OFF by default)
    v1.include_router(v1_wellbeing.router, tags=["wellbeing"])
    # Audio attachments — local Whisper transcription (v1-012)
    v1.include_router(v1_audio.router, tags=["audio"])
    # Phase 11 Media (B132+)
    v1.include_router(v1_media.router, tags=["media"])
    v1.include_router(v1_media_uploads.router, tags=["media"])
    v1.include_router(v1_pilgrimage_sites.router, tags=["pilgrimage"])
    v1.include_router(v1_ical_feed.router, tags=["ical"])
    # Phase 12 Federation (B137+) — single-vault subset.
    v1.include_router(v1_hubs.router, tags=["federation"])
    v1.include_router(
        v1_private_viewer_grants.router, tags=["federation"],
    )
    v1.include_router(
        v1_group_rituals.router, tags=["federation"],
    )
    v1.include_router(
        v1_federation_audit.router, tags=["federation"],
    )
    # Cross-vault DP aggregates (v1-033 · Tier 3 #20)
    v1.include_router(
        v1_hub_aggregates.router, tags=["federation"],
    )
    v1.include_router(v1_sso.router, tags=["federation"])
    v1.include_router(v1_activitypub.router, tags=["federation"])
    # Phase 14 Plugin Ecosystem
    v1.include_router(v1_plugins.router, tags=["plugins"])
    v1.include_router(v1_sandbox.router, tags=["sandbox"])
    # Magickal Bundle Format (ADR-0011, v1-011)
    v1.include_router(v1_bundles.router, tags=["bundles"])
    # Phase 15 Hardening (H10 Cluster B prerequisites)
    v1.include_router(v1_user_audit.router, tags=["hardening"])
    v1.include_router(v1_user_account.router, tags=["hardening"])
    v1.include_router(v1_user_sessions.router, tags=["hardening"])
    # Mode A vault-key rotation (v1-027 · Phase 15 B5)
    v1.include_router(v1_keys.router, tags=["hardening"])
    v1.include_router(v1_agents.router, tags=["agents"])
    # Vault-side MCP (Phase 16 close-out) — the endpoint the agent
    # daemon dials for scoped, read-only vault reads.
    v1.include_router(v1_vault_mcp.router, tags=["agents"])
    v1.include_router(v1_federation_inbox.router, tags=["federation"])
    v1.include_router(v1_federation_peers.router, tags=["federation"])
    v1.include_router(v1_registry_bridge.router, tags=["registry"])
    v1.include_router(v1_registry_author.router, tags=["registry"])
    v1.include_router(v1_registry_maintainer.router, tags=["registry"])
    # Unversioned iCal feed delivery — calendar clients subscribe to a
    # stable URL (RFC 5545). Lives at app level, not /api/v1.
    app.include_router(v1_ical_feed.feed_router, tags=["ical"])
    # AP actor + inbox + outbox + followers + following — at app level
    # (not /api/v1) because AP clients expect canonical URLs like
    # /users/{handle}.
    app.include_router(ap_actor.router, tags=["federation"])
    app.include_router(v1)
