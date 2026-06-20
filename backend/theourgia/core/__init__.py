"""Theourgia core framework code.

This package holds the platform's foundational concerns: settings, database
access, identity/auth/authz, encryption, plugin host, federation primitives.
Feature modules (journal, entities, divination, …) live in ``theourgia.modules``
and depend on ``theourgia.core``.
"""

from __future__ import annotations
