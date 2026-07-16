"""Shared fixtures for the MBF test files (v1-011).

Not a test module — imported by ``test_mbf_*.py`` and
``test_sandbox_bundle.py``. Follows the suite's DB-less style: the
fakes mirror ``test_closed_tradition.py``'s queue-backed session, and
the bundle builders produce REAL zipfile bytes via the production
container code.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from theourgia.core.bundles.container import build_mbf
from theourgia.core.bundles.manifest import PayloadDocument


class _Result:
    """Stand-in for a SQLAlchemy ``Result``."""

    def __init__(
        self, *, scalar: Any = None, rows: list[Any] | None = None,
    ) -> None:
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    """Queue-backed stand-in for ``AsyncSession`` — each ``execute``
    pops the next queued result, so tests assert the exact number of
    queries a path issues."""

    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0
        self.flushes = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        self.flushes += 1

    async def refresh(self, row: Any) -> None:
        return None


class _FakeUpload:
    """Duck-typed ``UploadFile`` carrying in-memory bytes."""

    def __init__(self, data: bytes, filename: str = "test.mbf") -> None:
        self._data = data
        self.filename = filename

    async def read(self, size: int = -1) -> bytes:
        if size < 0:
            return self._data
        return self._data[:size]


def _user() -> Any:
    return SimpleNamespace(id=uuid4())


def manifest_base(**over: Any) -> dict[str, Any]:
    """A minimal valid manifest, sans payload/asset digest entries
    (``build_mbf`` fills those)."""
    base: dict[str, Any] = {
        "mbf_version": 1,
        "type": "pantheon",
        "name": "Test Pantheon",
        "slug": "test-pantheon",
        "version": "1.0.0",
        "description": "A test bundle.",
        "author": {"name": "Soror Test"},
        "license": {"spdx": "CC-BY-SA-4.0", "magickal_tags": ["share-alike"]},
        "created_at": "2026-07-16T00:00:00Z",
    }
    base.update(over)
    return base


def entity_items() -> list[dict[str, Any]]:
    return [
        {
            "ref": "hekate",
            "name": "Hekate",
            "kind": "goddess",
            "epithets": ["Soteira", "Trivia"],
            "tradition": "hellenic",
            "tradition_tags": ["hellenic"],
            "summary": "Goddess of crossroads and keys.",
        },
        {
            "ref": "hermes",
            "name": "Hermes",
            "kind": "god",
            "tradition_tags": ["hellenic"],
        },
    ]


def recipe_items() -> list[dict[str, Any]]:
    return [
        {
            "ref": "crossroads-incense",
            "name": "Crossroads Incense",
            "kind": "incense",
            "ingredients": [{"name": "storax", "amount": "1 part"}],
            "steps": [{"text": "Blend under a dark moon."}],
            "correspondences": {"planetary": "moon"},
        },
    ]


def make_bundle(
    *,
    manifest_over: dict[str, Any] | None = None,
    payloads: list[tuple[str, list[dict[str, Any]]]] | None = None,
    assets: dict[str, tuple[bytes, str]] | None = None,
) -> bytes:
    """Real ``.mbf`` bytes: entities payload by default."""
    if payloads is None:
        payloads = [("entities", entity_items())]
    docs = [
        PayloadDocument(kind=kind, items=items) for kind, items in payloads
    ]
    return build_mbf(
        manifest_base=manifest_base(**(manifest_over or {})),
        payload_docs=docs,
        assets=assets,
    )
