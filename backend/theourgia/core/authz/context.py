"""Per-request authorization context.

Policies need things beyond ``(user, action, resource)`` to make
informed decisions — most obviously a DB session for membership /
relationship lookups. :class:`AuthzContext` carries that ambient state
so policies don't reach for module-level singletons.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

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
        metadata: Free-form bag for callers to pass extra context
            (federation peer DID, plugin-host invocation source,
            anything that helps policies make better decisions).
            Policies may inspect but shouldn't depend on undocumented
            keys.
    """

    db_session: "AsyncSession | None" = None
    request_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
