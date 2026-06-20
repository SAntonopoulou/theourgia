# Storage — developer guide

How features store and retrieve user uploads. The substrate is the same shape as the email substrate: features call into a service, backends are pluggable, real provider keys are operator-only.

## The substrate at a glance

```
core/storage/
├── validators.py             # detect_content_type, validate_size, ValidationError
├── service.py                # StorageService (orchestrator)
├── factory.py                # build_storage_service(settings)
└── backends/
    ├── base.py               # StorageBackend Protocol + StorageObject + StorageDeliveryError
    ├── null.py               # tests: in-memory
    ├── local.py              # dev: filesystem
    └── s3.py                 # production: S3-compatible

models/uploads.py             # Upload + UploadStatus
```

## Pattern: storing a small upload

```python
from theourgia.core.storage import StorageService

async def save_avatar(
    storage: StorageService,
    user_id: UUID,
    raw: bytes,
    content_type: str,
    db_session: AsyncSession,
) -> str:
    obj = await storage.put(
        key=f"users/{user_id}/avatar",
        content=raw,
        content_type=content_type,
        owner_id=user_id,
        db_session=db_session,
    )
    return obj.etag
```

The service:

1. Validates size against `THEOURGIA_STORAGE_MAX_UPLOAD_SIZE`.
2. Calls the backend's `put`.
3. Records an `Upload` row (owner, size, content_type, etag, backend, status=active).
4. Returns the `StorageObject` so callers know the etag.

## Pattern: large uploads via presigned PUT

For uploads bigger than a few megabytes, prefer direct client → storage uploads via a presigned URL. The flow:

1. Client requests an upload URL from an API endpoint.
2. API calls `storage.presigned_put_url(...)` and returns the URL.
3. Client PUTs directly to the URL.
4. Client tells the API "I'm done" via a registration endpoint.
5. API calls `storage.stat(key)` to verify the object exists, then writes the `Upload` row.

```python
url = await storage_service.presigned_put_url(
    key=f"vaults/{vault_id}/audio/{file_id}.opus",
    content_type="audio/opus",
    expires_in=900,           # 15 minutes
    max_size=50 * 1024 * 1024,
)
```

Local-FS backend doesn't support presigned PUT (it raises `StorageDeliveryError`). Operators who need that flow must run an S3-compatible backend.

## Pattern: deletion

```python
await storage_service.delete(
    key=f"users/{user_id}/avatar",
    db_session=db_session,
)
```

The service:

1. Calls `backend.delete(key)` (idempotent — missing keys aren't errors).
2. Flips the `Upload` row's status to `DELETED` (we keep the row for audit).

To garbage-collect the deleted rows themselves, run the operator script `python -m theourgia.scripts.upload_gc` (planned for Phase 11 hardening — not yet shipped).

## Pattern: testing

```python
@pytest.fixture
def storage():
    backend = NullStorageBackend()
    service = StorageService(backend=backend, max_upload_size=1024)
    return service, backend


@pytest.mark.asyncio
async def test_feature_uploads_avatar(storage):
    service, backend = storage
    await my_feature.set_avatar(service, user.id, b"png-bytes", "image/png")
    assert "users/" + str(user.id) + "/avatar" in backend.stored
```

The `NullStorageBackend` is in-memory; tests assert against `backend.stored`, `backend.deletions`, `backend.presigned_get_calls`, and `backend.presigned_put_calls`.

## Key-naming convention

Keys are slash-separated paths inside the storage bucket. Convention:

- `users/<uuid>/avatar` — user's avatar (one per user; latest wins)
- `users/<uuid>/uploads/<upload-id>` — generic personal upload
- `vaults/<uuid>/<resource>/<id>` — vault-scoped resource
- `hubs/<uuid>/<resource>/<id>` — hub-scoped resource
- `system/<purpose>/<id>` — system-uploaded blobs (not directly user-attributed)

Owner ID in the key is informational — actual access control lives in the API layer plus the `Upload` row's RLS. Don't rely on key opacity for authorization.

## Content type — sniff vs trust

`detect_content_type(filename)` uses stdlib `mimetypes` for a filename-based guess. Sufficient for what the operator labels uploads as; not sufficient for security decisions (a file named `.png` may not actually be a PNG).

For any feature that processes upload contents (image resizing, audio transcoding, OCR, etc.), **re-validate the actual bytes** before trusting them. Phase 11 hardening will add real content sniffing via libmagic; until then, treat the recorded `content_type` as advisory.

## When to write through `service.put` vs `backend.put` directly

Always through the service. The backend's `put` skips:

- Size validation
- Upload-table row insertion
- The hook point future features will plug into (virus scanning, image processing, federation broadcast on new media)

Direct backend access is for the storage substrate itself (factory construction, tests).
