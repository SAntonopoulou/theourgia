# R2 buckets — provisioned 2026-06-28

Three Cloudflare R2 buckets in **WEUR** (Western Europe) were provisioned
for the production stack. WEUR was chosen for GDPR alignment with the
project's data-sovereignty ethos and proximity to EU magicians.

| Bucket | Purpose | Wires to |
|---|---|---|
| `theourgia-media` | Phase 11 media uploads (audio attachments, image uploads, sigil exports, talisman renderings) | `THEOURGIA_STORAGE_S3_BUCKET` |
| `theourgia-backups` | Phase 01 restic backup target — backend DB + agent-daemon DB + registry DB nightly snapshots | `RESTIC_REPOSITORY` |
| `theourgia-plugins` | Phase 14 plugin tarball storage — uploaded by author at submission, served by registry on accept | `THEOURGIA_REGISTRY_R2_BUCKET` |

## Generating credentials

The MCP tooling available during automation does not include R2 token
creation — you must do this once via the Cloudflare dashboard:

1. **Dashboard → R2 → Manage R2 API Tokens → Create API Token**
2. Three tokens, scoped narrowly per bucket (defence in depth — a
   compromised media token cannot exfiltrate backups):

   | Token name | Permissions | Buckets |
   |---|---|---|
   | `theourgia-media-rw` | Object Read & Write | `theourgia-media` only |
   | `theourgia-backups-rw` | Object Read & Write | `theourgia-backups` only |
   | `theourgia-plugins-rw` | Object Read & Write | `theourgia-plugins` only |

3. Cloudflare prints the Access Key ID + Secret Access Key + endpoint
   URL **once** — save them to your password manager AND populate the
   server's `.env`:

```bash
# .env on the production host
AWS_ACCESS_KEY_ID=<media-rw access key>
AWS_SECRET_ACCESS_KEY=<media-rw secret>
AWS_DEFAULT_REGION=auto
# R2 uses bucket-specific endpoints, format:
# https://<account-id>.r2.cloudflarestorage.com
THEOURGIA_STORAGE_S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
THEOURGIA_STORAGE_S3_BUCKET=theourgia-media

# Phase 01 backups — restic uses S3 URL format
RESTIC_REPOSITORY=s3:https://<your-account-id>.r2.cloudflarestorage.com/theourgia-backups
RESTIC_PASSWORD=<long randomly-generated secret; back up offline>
# Restic reads AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY for R2.
# If using a separate token for backups (recommended), set:
# RESTIC_AWS_ACCESS_KEY_ID + RESTIC_AWS_SECRET_ACCESS_KEY
```

## Verification

After populating `.env`, test the connection:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend \
    python -c "
import boto3, os
client = boto3.client(
    's3',
    endpoint_url=os.environ['THEOURGIA_STORAGE_S3_ENDPOINT'],
    region_name='auto',
)
print(client.list_buckets())
"
```

You should see all three bucket names in the response.

## Lifecycle policies (recommended)

For `theourgia-backups`, enable a lifecycle policy in the Cloudflare
dashboard to move snapshots older than 30 days to the Infrequent Access
storage class. Restic handles its own pruning via `forget` policies,
which is the primary retention mechanism — the R2 lifecycle policy is
a belt-and-suspenders against accidentally over-retaining.

For `theourgia-media`, no lifecycle is set — magician uploads are
practitioner-owned and the user controls deletion (rule 14: data
sovereignty).

For `theourgia-plugins`, no lifecycle is set — plugin tarballs are
immutable once accepted (rule 40: withdrawn plugins are tombstoned,
never deleted; existing installs keep working).
