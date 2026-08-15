"""Theourgia ORM models.

Models are organized by domain. Each domain module declares its SQLModel
classes and registers them on the shared metadata. Import order matters
only insofar as Alembic's autogenerate machinery needs all models loaded
when it inspects the metadata — so all model modules are imported here.
"""

from __future__ import annotations

# Import all model modules so SQLModel.metadata sees them.
from theourgia.models import (  # noqa: F401
    agents,
    astragaloi,
    audit,
    auth,
    backups,
    base,
    bundles,
    comment,
    crypto,
    curriculum,
    email,
    entities,
    entries,
    events,
    federation_activity,
    federation_delivery,
    federation_nonce,
    federation_peer,
    identity,
    instancesettings,
    library,
    link_code,
    memorial,
    notifications,
    persona,
    pilgrimage_route,
    plugins,
    recipe,
    sandbox,
    spiritual_map,
    tea_leaf,
    uploads,
    usersettings,
    webauthn,
)

__all__ = [
    "agents",
    "astragaloi",
    "audit",
    "auth",
    "backups",
    "base",
    "bundles",
    "comment",
    "crypto",
    "curriculum",
    "email",
    "entities",
    "entries",
    "events",
    "federation_activity",
    "federation_delivery",
    "federation_nonce",
    "federation_peer",
    "identity",
    "instancesettings",
    "library",
    "link_code",
    "memorial",
    "notifications",
    "persona",
    "pilgrimage_route",
    "plugins",
    "recipe",
    "sandbox",
    "spiritual_map",
    "tea_leaf",
    "uploads",
    "usersettings",
    "webauthn",
]
