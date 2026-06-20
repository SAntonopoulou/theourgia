"""GDPR substrate — data export, account deletion, consent.

The legal substrate. Every feature that stores user data registers
two callables here:

- An **exporter** — produces a JSON-serializable representation of
  what the feature stores for a given user. Used to fulfill GDPR
  Article 15 (right of access) and Article 20 (data portability).
- A **deletion handler** — removes or anonymizes the feature's
  storage for a user. Used to fulfill Article 17 (right to erasure).

The central export and deletion endpoints (added with Phase 02 auth UI)
iterate the registries; feature owners never write per-feature export
endpoints. Tests verify that every feature with a user_id column
appears in both registries — missing entries fail the audit pass.

Consent management is a thinner layer: per-user records of consent
to specific processing purposes (analytics, federation, AI training,
etc.). Features can read consent state to decide whether to engage in
a particular processing operation; the audit log records consent
changes.
"""

from __future__ import annotations

from theourgia.core.gdpr.consent import (
    ConsentPurpose,
    ConsentResolver,
    ConsentSet,
    InMemoryConsentResolver,
)
from theourgia.core.gdpr.export import (
    ExportContext,
    ExportRegistry,
    Exporter,
    default_export_registry,
    register_exporter,
)
from theourgia.core.gdpr.deletion import (
    DeletionContext,
    DeletionHandler,
    DeletionRegistry,
    default_deletion_registry,
    register_deletion_handler,
)
from theourgia.core.gdpr.service import GDPRService

__all__ = [
    "ConsentPurpose",
    "ConsentResolver",
    "ConsentSet",
    "DeletionContext",
    "DeletionHandler",
    "DeletionRegistry",
    "ExportContext",
    "ExportRegistry",
    "Exporter",
    "GDPRService",
    "InMemoryConsentResolver",
    "default_deletion_registry",
    "default_export_registry",
    "register_deletion_handler",
    "register_exporter",
]
