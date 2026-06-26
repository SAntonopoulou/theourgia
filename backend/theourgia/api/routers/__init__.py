"""API routers.

Routers are organized by domain. The router files attach to the
application via :func:`register_routers` in :mod:`theourgia.api.app`.

Versioned routes live under ``v1/``; unversioned (health, OpenAPI,
docs) live at the top level.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from theourgia.api.routers import health, metrics, well_known
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
from theourgia.api.routers.v1 import iching as v1_iching
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
from theourgia.api.routers.v1 import user_settings as v1_user_settings
from theourgia.api.routers.v1 import voces as v1_voces
from theourgia.api.routers.v1 import ciphers as v1_ciphers
from theourgia.api.routers.v1 import gematria_search as v1_gematria_search
from theourgia.api.routers.v1 import studies as v1_studies
from theourgia.api.routers.v1 import transliteration as v1_transliteration
from theourgia.api.routers.v1 import synchronicities as v1_synchronicities

__all__ = ["register_routers"]


def register_routers(app: FastAPI) -> None:
    """Attach all routers to the app."""
    # Unversioned operational endpoints
    app.include_router(health.router, tags=["operations"])
    app.include_router(metrics.router, tags=["operations"])

    # .well-known endpoints (federation discovery, etc.)
    app.include_router(well_known.router, tags=["federation"])

    # Versioned API surface (v1)
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(v1_meta.router, tags=["meta"])
    v1.include_router(v1_auth.router, tags=["auth"])
    v1.include_router(v1_entries.router, tags=["entries"])
    v1.include_router(v1_entities.router, tags=["entities"])
    v1.include_router(v1_library.router, tags=["library"])
    v1.include_router(v1_user_settings.router, tags=["user_settings"])
    v1.include_router(v1_astro.router, tags=["astro"])
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
    app.include_router(v1)
