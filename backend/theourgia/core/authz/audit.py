"""Audit log writer.

The :class:`AuditLogger` persists :class:`AuditEvent` rows for
security-relevant operations: authentication events, visibility
changes, sealed-content reads, federation operations, plugin lifecycle,
admin actions, and so on.

The actual append-only constraint is enforced at the database layer
(see migration ``0001_initial_extensions_and_identity.py`` — the
``trg_audit_event_immutable`` trigger raises on any UPDATE or DELETE).
This module just constructs and adds rows to a session.

Two entry points:

- :func:`build_audit_event` — pure factory that returns an
  :class:`AuditEvent` instance without persisting. Useful for unit
  tests that want to assert on field shapes without a database.
- :class:`AuditLogger` — wraps a session and provides
  :meth:`AuditLogger.log` which builds and persists in one step,
  returning the persisted (flushed) event.

The caller controls commit. Auditing must not silently commit on
behalf of the rest of the request.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlmodel import SQLModel  # noqa: F401  (re-export touch for type help)

from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["AuditLogger", "build_audit_event"]


def build_audit_event(
    *,
    kind: AuditEventKind,
    action: str,
    outcome: AuditOutcome,
    actor_id: UUID | None = None,
    vault_id: UUID | None = None,
    hub_id: UUID | None = None,
    ip_address: str | None = None,
    user_agent: str = "",
    detail: dict[str, object] | None = None,
) -> AuditEvent:
    """Construct an :class:`AuditEvent` without persisting it.

    Pure factory. Useful for tests and for code paths that build events
    in batch before persisting. Field validation matches the model
    (string lengths, JSONB default, etc.).
    """
    if not action:
        msg = "action must not be empty"
        raise ValueError(msg)
    if len(action) > 128:
        msg = f"action must be <= 128 chars, got {len(action)}"
        raise ValueError(msg)
    if ip_address is not None and len(ip_address) > 45:
        msg = f"ip_address must be <= 45 chars (IPv6 max), got {len(ip_address)}"
        raise ValueError(msg)
    if len(user_agent) > 512:
        # Clamp rather than reject — UA strings are noisy from the wild
        user_agent = user_agent[:512]

    return AuditEvent(
        kind=kind,
        action=action,
        outcome=outcome,
        actor_id=actor_id,
        vault_id=vault_id,
        hub_id=hub_id,
        ip_address=ip_address,
        user_agent=user_agent,
        detail=dict(detail) if detail else {},
    )


class AuditLogger:
    """Writer that persists :class:`AuditEvent` rows to a session.

    Usage::

        logger = AuditLogger(session)
        await logger.log(
            kind=AuditEventKind.AUTH,
            action="login",
            outcome=AuditOutcome.SUCCESS,
            actor_id=user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent", ""),
        )

    The session is provided by the caller; the logger does not own
    transaction lifecycle. The caller commits.
    """

    __slots__ = ("session",)

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log(
        self,
        *,
        kind: AuditEventKind,
        action: str,
        outcome: AuditOutcome,
        actor_id: UUID | None = None,
        vault_id: UUID | None = None,
        hub_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str = "",
        detail: dict[str, object] | None = None,
    ) -> AuditEvent:
        """Build and persist an audit event.

        The returned :class:`AuditEvent` has its ``id`` populated
        (``session.flush()`` is called); the caller is responsible for
        committing the transaction.

        Auditing failures must not silently swallow data: if the flush
        raises, the exception propagates. Higher-level error handling
        decides whether to abort the whole request or log+continue.
        """
        event = build_audit_event(
            kind=kind,
            action=action,
            outcome=outcome,
            actor_id=actor_id,
            vault_id=vault_id,
            hub_id=hub_id,
            ip_address=ip_address,
            user_agent=user_agent,
            detail=detail,
        )
        self.session.add(event)
        await self.session.flush()
        return event
