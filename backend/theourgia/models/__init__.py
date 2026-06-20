"""Theourgia ORM models.

Models are organized by domain. Each domain module declares its SQLModel
classes and registers them on the shared metadata. Import order matters
only insofar as Alembic's autogenerate machinery needs all models loaded
when it inspects the metadata — so all model modules are imported here.
"""

from __future__ import annotations

# Import all model modules so SQLModel.metadata sees them.
from theourgia.models import audit, auth, base, crypto, identity, plugins  # noqa: F401

__all__ = ["audit", "auth", "base", "crypto", "identity", "plugins"]
