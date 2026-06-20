"""Persona service — lifecycle operations on personas.

A thin layer above the ORM that enforces the substrate's invariants:

- Exactly one persona per user has ``kind=DEFAULT``.
- The default persona cannot be deleted (its user must delete the
  whole account to remove it).
- Handles are instance-wide unique (case-insensitive via CITEXT).
- Switching active persona requires the persona to belong to the
  session's user.

The service is intentionally async + injectable so tests can pass an
in-memory store stand-in (or a real test database) without changes
to feature code.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select

from theourgia.core.clock import now
from theourgia.models.persona import Persona, PersonaKind

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "PersonaConflictError",
    "PersonaError",
    "PersonaNotFoundError",
    "PersonaService",
]

_log = logging.getLogger(__name__)


# Handle constraints: ASCII alphanumeric + hyphen + underscore, 2..64
# chars, must start with a letter, no trailing hyphen/underscore. Same
# shape as a federation actor identifier; matches what well-known
# directory implementations accept.
_HANDLE_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_-]{1,62}[a-zA-Z0-9]$")


class PersonaError(Exception):
    """Base class for persona-service errors."""


class PersonaNotFoundError(PersonaError):
    """Raised when a lookup by id or handle finds nothing."""


class PersonaConflictError(PersonaError):
    """Raised on uniqueness violations (handle taken, double-default)."""


class PersonaService:
    """Persona lifecycle operations.

    Construct with an async session; methods don't open or close
    the session — the caller controls the transaction. The service
    persists changes (``session.add`` / ``session.delete``) but does
    NOT commit; the caller commits on success."""

    def __init__(self, session: "AsyncSession") -> None:
        self._session = session

    # ── Lookup ───────────────────────────────────────────────────────

    async def get_by_id(self, persona_id: UUID) -> Persona:
        """Return the persona with this id. Raises
        :class:`PersonaNotFoundError` if absent."""
        result = await self._session.execute(
            select(Persona).where(Persona.id == persona_id)
        )
        persona = result.scalar_one_or_none()
        if persona is None:
            raise PersonaNotFoundError(f"persona not found: {persona_id}")
        return persona

    async def get_by_handle(self, handle: str) -> Persona:
        """Look up by handle (case-insensitive). Raises
        :class:`PersonaNotFoundError` if absent."""
        result = await self._session.execute(
            select(Persona).where(Persona.handle == handle)
        )
        persona = result.scalar_one_or_none()
        if persona is None:
            raise PersonaNotFoundError(f"persona not found: handle={handle!r}")
        return persona

    async def list_for_user(self, user_id: UUID) -> list[Persona]:
        """All personas (active and inactive) belonging to a user,
        ordered with the default first."""
        result = await self._session.execute(
            select(Persona)
            .where(Persona.user_id == user_id)
            .order_by(Persona.kind.desc(), Persona.created_at)
        )
        return list(result.scalars().all())

    async def get_default_for_user(self, user_id: UUID) -> Persona:
        """Return the user's default persona. Raises
        :class:`PersonaNotFoundError` if the user has none — which
        should only happen for users that predate the persona
        migration (and the auth flow should auto-fix on next login)."""
        result = await self._session.execute(
            select(Persona).where(
                Persona.user_id == user_id,
                Persona.kind == PersonaKind.DEFAULT,
            )
        )
        persona = result.scalar_one_or_none()
        if persona is None:
            raise PersonaNotFoundError(
                f"user {user_id} has no default persona"
            )
        return persona

    # ── Creation ─────────────────────────────────────────────────────

    async def create_default_for_user(
        self,
        *,
        user_id: UUID,
        handle: str,
        display_name: str,
        bio: str = "",
    ) -> Persona:
        """Create the user's one-and-only default persona.

        Called as part of signup. Raises :class:`PersonaConflictError`
        if the handle is taken or the user already has a default."""
        self._validate_handle(handle)

        # Check uniqueness explicitly (clearer error than the DB
        # constraint kicking in at commit).
        if await self._handle_taken(handle):
            raise PersonaConflictError(f"handle already taken: {handle!r}")

        existing_default = await self._user_has_default(user_id)
        if existing_default:
            raise PersonaConflictError(
                f"user {user_id} already has a default persona"
            )

        persona = Persona(
            user_id=user_id,
            kind=PersonaKind.DEFAULT,
            handle=handle,
            display_name=display_name or handle,
            bio=bio,
            is_active=True,
        )
        self._session.add(persona)
        await self._session.flush()
        _log.info(
            "persona.default_created",
            extra={
                "user_id": str(user_id),
                "persona_id": str(persona.id),
                "handle": handle,
            },
        )
        return persona

    async def create_secondary(
        self,
        *,
        user_id: UUID,
        handle: str,
        display_name: str,
        bio: str = "",
    ) -> Persona:
        """Create a secondary persona for a user.

        Users may have any number of these. Raises
        :class:`PersonaConflictError` on handle collision."""
        self._validate_handle(handle)
        if await self._handle_taken(handle):
            raise PersonaConflictError(f"handle already taken: {handle!r}")

        persona = Persona(
            user_id=user_id,
            kind=PersonaKind.SECONDARY,
            handle=handle,
            display_name=display_name or handle,
            bio=bio,
            is_active=True,
        )
        self._session.add(persona)
        await self._session.flush()
        _log.info(
            "persona.secondary_created",
            extra={
                "user_id": str(user_id),
                "persona_id": str(persona.id),
                "handle": handle,
            },
        )
        return persona

    # ── Update ───────────────────────────────────────────────────────

    async def update(
        self,
        persona: Persona,
        *,
        display_name: str | None = None,
        bio: str | None = None,
        public_face_enabled: bool | None = None,
        is_active: bool | None = None,
    ) -> Persona:
        """Update mutable fields on an existing persona.

        Handle and kind are intentionally NOT mutable — handle has
        federation implications (peers cache it), kind is a structural
        invariant. To "rename" a persona, the user creates a new one
        and migrates content (a Phase 02+ operation)."""
        if display_name is not None:
            persona.display_name = display_name
        if bio is not None:
            persona.bio = bio
        if public_face_enabled is not None:
            persona.public_face_enabled = public_face_enabled
        if is_active is not None:
            if persona.kind == PersonaKind.DEFAULT and not is_active:
                raise PersonaError(
                    "cannot deactivate the default persona"
                )
            persona.is_active = is_active
        persona.updated_at = now()
        await self._session.flush()
        return persona

    async def delete_secondary(self, persona_id: UUID) -> None:
        """Remove a secondary persona. Refuses to delete a default
        persona — that requires deleting the whole user account."""
        persona = await self.get_by_id(persona_id)
        if persona.kind == PersonaKind.DEFAULT:
            raise PersonaError(
                "cannot delete the default persona; delete the user account "
                "to remove it"
            )
        await self._session.delete(persona)
        await self._session.flush()
        _log.info(
            "persona.deleted",
            extra={"persona_id": str(persona_id), "handle": persona.handle},
        )

    # ── Internal ─────────────────────────────────────────────────────

    def _validate_handle(self, handle: str) -> None:
        if not handle:
            raise PersonaError("handle must not be empty")
        if not _HANDLE_RE.match(handle):
            raise PersonaError(
                f"invalid handle: {handle!r}. Handles must be 3-64 chars, "
                "start with a letter, contain only ASCII letters / digits / "
                "underscore / hyphen, and not end with hyphen or underscore."
            )

    async def _handle_taken(self, handle: str) -> bool:
        result = await self._session.execute(
            select(Persona.id).where(Persona.handle == handle).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def _user_has_default(self, user_id: UUID) -> bool:
        result = await self._session.execute(
            select(Persona.id).where(
                Persona.user_id == user_id,
                Persona.kind == PersonaKind.DEFAULT,
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None
