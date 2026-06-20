"""Authorization primitives.

Theourgia's authorization model has three layers:

1. **Visibility on content** — every content row carries a
   :class:`Visibility` value (``personal`` / ``viewer`` / ``network`` /
   ``public`` / ``sealed``). The application layer checks visibility on
   every read; the database layer enforces the same via Row-Level
   Security policies.

2. **Scopes for actions** — :class:`Scope` declares the action a
   request intends to perform (``entry.read``, ``vault.delete``,
   ``hub.admin``, …). Endpoints declare the scopes they require; a
   permission check verifies the caller's relationship to the resource
   covers the required scope.

3. **Row-Level Security at the database** — defense in depth. Even if
   application-level checks have a bug, RLS policies prevent
   unauthorized rows from leaving the database. Per-request, the
   application sets ``theourgia.current_user_id`` via
   :func:`set_current_user_id`; policies read this GUC.

Audit events for security-relevant operations land via
:class:`AuditLogger`.

The interface intentionally exports a small surface; the rest of the
codebase imports from this package, never from sub-modules directly,
so we can refactor internals without ripple.
"""

from __future__ import annotations

from theourgia.core.authz.audit import AuditLogger, build_audit_event
from theourgia.core.authz.checks import (
    can_read_with_visibility,
    can_write_with_visibility,
)
from theourgia.core.authz.rls import clear_current_user_id, set_current_user_id
from theourgia.core.authz.scopes import Scope
from theourgia.core.authz.visibility import Visibility

__all__ = [
    "Visibility",
    "Scope",
    "AuditLogger",
    "build_audit_event",
    "can_read_with_visibility",
    "can_write_with_visibility",
    "set_current_user_id",
    "clear_current_user_id",
]
