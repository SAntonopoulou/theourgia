# Object storage — operator runbook

Theourgia stores user uploads (avatars, sigil images, ritual photos, audio recordings) via a pluggable backend. The default install uses local-filesystem storage; production deployments configure an S3-compatible backend.

## Choosing a backend

Set `THEOURGIA_STORAGE_BACKEND` to one of:

| Backend | When to use | Requires |
|---|---|---|
| `local` | Development, small self-hosted instances | Disk space at `THEOURGIA_STORAGE_LOCAL_PATH` |
| `s3` | Production with any S3-compatible service (R2, B2, Hetzner, MinIO, AWS S3) | `pip install theourgia[storage-s3]` + S3 credentials |
| `null` | Tests | nothing |

## Required settings (all backends)

| Variable | Purpose |
|---|---|
| `THEOURGIA_STORAGE_BACKEND` | Which backend to use |
| `THEOURGIA_STORAGE_MAX_UPLOAD_SIZE` | Per-upload cap in bytes; default 50 MiB |

## Local filesystem

```bash
THEOURGIA_STORAGE_BACKEND=local
THEOURGIA_STORAGE_LOCAL_PATH=/var/lib/theourgia/storage
THEOURGIA_STORAGE_MAX_UPLOAD_SIZE=52428800   # 50 MiB
```

The local backend rejects path traversal (`..`), absolute paths, and any key that resolves outside the configured root. The path must be writable by the application process; backups (Restic) should include it.

**Limitations:**

- No presigned PUT URLs (the client can't upload directly; everything streams through the API). For instances with substantial upload volume, switch to S3.
- Presigned GET URLs return a placeholder that's served by an API endpoint; performant only when the volume is small.

## S3-compatible (production)

Works with any S3 API: AWS S3, Cloudflare R2, Backblaze B2, Hetzner Object Storage, MinIO, etc.

```bash
THEOURGIA_STORAGE_BACKEND=s3
THEOURGIA_STORAGE_S3_BUCKET=theourgia-uploads
THEOURGIA_STORAGE_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
THEOURGIA_STORAGE_S3_REGION=auto
THEOURGIA_STORAGE_S3_ACCESS_KEY=...
THEOURGIA_STORAGE_S3_SECRET_KEY=...
THEOURGIA_STORAGE_S3_USE_SSL=true
THEOURGIA_STORAGE_MAX_UPLOAD_SIZE=104857600  # 100 MiB
```

The S3 backend gracefully degrades when `boto3` isn't installed — it raises a clear error pointing the operator at the `[storage-s3]` extra rather than crashing on import.

## Common providers

| Provider | Endpoint pattern | Region | Notes |
|---|---|---|---|
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | `auto` | No egress fees; recommended default |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` | per bucket | Lowest cost per GB |
| Hetzner | `https://s3.<region>.hetznerobjects.com` | per location | Bundled with Hetzner Cloud |
| AWS S3 | `https://s3.<region>.amazonaws.com` | per bucket | Standard |
| MinIO | `https://<your-minio-host>` | `us-east-1` | Self-hosted |

## Audit & quotas

Every upload is recorded in the `upload` table with size, content type, backend, and owner. Aggregates:

- Per-user total: `SELECT SUM(size_bytes) FROM upload WHERE owner_id = $1 AND status = 'active'`
- Per-backend totals: `SELECT backend, SUM(size_bytes) FROM upload WHERE status = 'active' GROUP BY backend`

Phase 11 hardening adds quota enforcement and orphan detection (rows marked deleted whose backend object still exists, and vice versa).

## Bucket setup notes

For S3-compatible production:

1. **Create the bucket.** Use a unique name; not all providers allow renames.
2. **Set CORS** so the frontend can use presigned PUT URLs:

   ```json
   [{
     "AllowedOrigins": ["https://your-theourgia-domain.tld"],
     "AllowedMethods": ["PUT", "GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 3600
   }]
   ```

3. **Set lifecycle policies** if you want automatic cleanup of failed uploads or old soft-deleted objects.
4. **Restrict the IAM/policy** to the bucket (least-privilege).
5. **Backups:** the storage bucket is *not* automatically backed up by the Restic backups (those cover Postgres + media on the filesystem). Configure provider-side replication or cross-account snapshots separately.
