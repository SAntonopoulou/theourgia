"""Storage backend Protocol and shared types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

__all__ = ["StorageBackend", "StorageDeliveryError", "StorageObject"]


class StorageDeliveryError(Exception):
    """Raised when a backend fails to read / write / delete."""

    def __init__(
        self,
        message: str,
        *,
        backend: str,
        provider_error: str | None = None,
    ) -> None:
        super().__init__(message)
        self.backend = backend
        self.provider_error = provider_error


@dataclass(frozen=True, slots=True)
class StorageObject:
    """Metadata about an object after it's been stored.

    Returned by :meth:`StorageBackend.put` and (without ``content``) by
    :meth:`StorageBackend.stat`. Backends populate as much as they can;
    fields unsupported by a particular backend stay at their defaults.
    """

    key: str
    size: int
    content_type: str
    etag: str = ""
    backend: str = ""
    metadata: dict[str, str] = field(default_factory=dict)


@runtime_checkable
class StorageBackend(Protocol):
    """Pluggable object-storage interface.

    Implementations must be async-callable. They must raise
    :class:`StorageDeliveryError` for any I/O failure — provider
    exceptions are wrapped, never leaked.
    """

    name: str

    async def put(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str,
        metadata: dict[str, str] | None = None,
    ) -> StorageObject:
        """Write ``content`` under ``key``. Overwrites if the key
        already exists."""
        ...

    async def get(self, key: str) -> bytes:
        """Read the object's contents. Raises
        :class:`StorageDeliveryError` if missing."""
        ...

    async def delete(self, key: str) -> None:
        """Remove the object. Idempotent — missing keys are not an error."""
        ...

    async def exists(self, key: str) -> bool:
        ...

    async def stat(self, key: str) -> StorageObject:
        """Return metadata about a stored object."""
        ...

    async def presigned_get_url(
        self,
        key: str,
        *,
        expires_in: int = 3600,
    ) -> str:
        """Return a short-lived URL for direct client read access.

        Not every backend supports this; backends that don't raise
        :class:`StorageDeliveryError`."""
        ...

    async def presigned_put_url(
        self,
        key: str,
        *,
        content_type: str,
        expires_in: int = 3600,
        max_size: int | None = None,
    ) -> str:
        """Return a short-lived URL for direct client write access.

        The client PUTs to this URL; on completion the application
        records the upload via a registration endpoint."""
        ...
