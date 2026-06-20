"""Per-request authorization context.

Policies need things beyond ``(user, action, resource)`` to make
informed decisions — most obviously a DB session for membership /
relationship lookups. :class:`AuthzContext` carries that ambient state
so policies don't reach for module-level singletons.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["AuthzContext"]


@dataclass
class AuthzContext:
    """Ambient state available to every policy during a single
    authorize() call.

    Attributes:
        db_session: For policies that need to consult the database
            (membership lookups, role checks). Most policies need it;
            policies registered for ``GLOBAL_RESOURCE`` often do.
        request_id: Mirrors the observability request_id so denials
            can be correlated with surrounding log lines.
        active_persona_id: Which of the user's personas is acting on
            this request (set from ``session.active_persona_id`` by
            the auth dependency). Policies that authorize content by
            ownership use this to determine "do I own this through
            my active persona?". None during pre-persona session
            compatibility or for system actions outside any persona
            context.
        metadata: Free-form bag for callers to pass extra context
            (federation peer DID, plugin-host invocation source,
            anything that helps policies make better decisions).
            Policies may inspect but shouldn't depend on undocumented
            keys.
    """

    db_session: "AsyncSession | None" = None
    request_id: str | None = None
    active_persona_id: UUID | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
