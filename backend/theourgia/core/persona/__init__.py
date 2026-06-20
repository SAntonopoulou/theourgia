"""Persona substrate — multi-identity layer above User.

The architectural decision is recorded in
``plan/persona-decision-2026-06-21.md``. This package owns the
runtime behaviour: auto-creating a default persona on signup, listing
a user's personas, switching the active persona on a session.

Canonical call points::

    # When a user signs up:
    default = await persona_service.create_default_for_user(
        user_id=user.id,
        display_name=user.email.split("@")[0],
    )
    session.active_persona_id = default.id

    # When a user wants to add a secondary persona:
    secondary = await persona_service.create_secondary(
        user_id=user.id,
        handle="ritualist",
        display_name="The Ritualist",
    )

    # When a user switches active persona:
    await persona_service.switch_active(
        session_id=session.id,
        persona_id=secondary.id,
    )
"""

from __future__ import annotations

from theourgia.core.persona.service import (
    PersonaConflictError,
    PersonaError,
    PersonaNotFoundError,
    PersonaService,
)

__all__ = [
    "PersonaConflictError",
    "PersonaError",
    "PersonaNotFoundError",
    "PersonaService",
]
