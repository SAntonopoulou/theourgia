"""DB-backed recipient lookup + preference resolver.

The service protocols (:class:`RecipientLookup`, :class:`PreferenceResolver`)
were designed injectable from day one; tests use the in-memory
implementations. These are the production implementations — first
consumed by the memorial sweep (v1-018), reusable by any feature that
dispatches through :class:`NotificationService` from a background task.

Both open a short-lived session per call via :func:`session_scope` so
they are safe to use from Celery tasks that manage their own loops.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from theourgia.core.db import session_scope
from theourgia.core.notifications.message import DeliveryChannel
from theourgia.core.notifications.preferences import PreferenceSet
from theourgia.core.notifications.service import RecipientInfo

__all__ = ["DbPreferenceResolver", "DbRecipientLookup", "GLOBAL_PREFERENCE_KIND"]


GLOBAL_PREFERENCE_KIND = "__global__"
"""The reserved kind of the row that carries the do-not-disturb toggle."""


class DbRecipientLookup:
    """Resolves a user id to their email via the ``user`` table."""

    async def get(self, user_id: UUID) -> RecipientInfo | None:
        from theourgia.models.identity import User

        async with session_scope() as session:
            stmt = select(User).where(User.id == user_id)
            user = (await session.execute(stmt)).scalar_one_or_none()
            if user is None:
                return None
            return RecipientInfo(
                user_id=user_id,
                email=user.email,
            )


class DbPreferenceResolver:
    """Builds a :class:`PreferenceSet` from ``notification_preference``
    rows. Users without rows get the empty set — template defaults
    apply, matching the in-memory resolver's behavior."""

    async def get(self, user_id: UUID) -> PreferenceSet:
        from theourgia.models.notifications import NotificationPreferenceRow

        async with session_scope() as session:
            stmt = select(NotificationPreferenceRow).where(
                NotificationPreferenceRow.user_id == user_id
            )
            rows = (await session.execute(stmt)).scalars().all()

        enabled: dict[str, frozenset[DeliveryChannel]] = {}
        fully_muted = False
        for row in rows:
            if row.kind == GLOBAL_PREFERENCE_KIND:
                fully_muted = row.fully_muted
                continue
            channels = frozenset(
                DeliveryChannel(token.strip())
                for token in row.channels_csv.split(",")
                if token.strip()
            )
            enabled[row.kind] = channels
        return PreferenceSet(enabled=enabled, fully_muted=fully_muted)
