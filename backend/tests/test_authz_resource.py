"""Tests for the Resource protocol + GLOBAL_RESOURCE sentinel."""

from __future__ import annotations

from typing import ClassVar
from uuid import UUID, uuid4

from theourgia.core.authz.resource import GLOBAL_RESOURCE, Resource


def test_global_resource_satisfies_protocol() -> None:
    assert isinstance(GLOBAL_RESOURCE, Resource)
    assert GLOBAL_RESOURCE.resource_type == "__global__"


def test_global_resource_is_singleton_friendly() -> None:
    """Two references to GLOBAL_RESOURCE point at the same object."""
    from theourgia.core.authz.resource import GLOBAL_RESOURCE as gr2

    assert GLOBAL_RESOURCE is gr2


def test_user_defined_resource_satisfies_protocol() -> None:
    """Any class with the right shape satisfies the runtime-checkable
    Protocol — even a plain dataclass."""
    from dataclasses import dataclass

    @dataclass
    class FakeEntry:
        resource_type: ClassVar[str] = "entry"
        id: UUID = uuid4()

    entry = FakeEntry()
    assert isinstance(entry, Resource)
    assert entry.resource_type == "entry"
