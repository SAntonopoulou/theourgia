# Theourgia Helm chart

A community-supported Helm chart for deploying [Theourgia](https://github.com/SAntonopoulou/theourgia) on Kubernetes.

**Docker Compose is the primary deployment path.** The reference deployment — the one the maintainer runs, tests against, and documents first — is `docker-compose.yml` + `docker-compose.prod.yml` at the repository root. This chart mirrors that topology for operators who already run Kubernetes and prefer to keep everything in one cluster. Kubernetes-specific issues are triaged best-effort; contributions are warmly welcomed.

Theourgia is licensed AGPL-3.0-or-later. If you modify it and serve it to users over a network, you must offer those users the corresponding source.

## What gets deployed

| Component | Kind | Default | Notes |
|---|---|---|---|
| backend | Deployment + Service | on | FastAPI, port 8000; readiness `/readyz`, liveness `/healthz` |
| celery-worker | Deployment | on | Background jobs; backend image |
| celery-beat | Deployment | on | Scheduler; fixed single replica, `Recreate` strategy (singleton) |
| frontend | Deployment + Service | on | Static site + bundled Caddy, port 80 |
| migrations | Job (Helm hook) | on | `alembic upgrade head` before install/upgrade |
| agent-daemon | Deployment + Service + PVC | **off** | Opt-in AI agent supervision (Phase 16); needs its own database |
| registry | Deployment + Service | **off** | Opt-in self-hosted plugin registry; needs its own database |
| ingress | Ingress | **off** | All traffic to frontend; optional second vhost for the registry |
| postgresql / redis | StatefulSet + Service | **off** | Single-replica, **evaluation only** |

PostgreSQL and Redis are deliberately *not* templated as production stateful stores. Point `postgresql.external.url` / `redis.external.url` at a managed service or an operator-managed cluster (CloudNativePG, Zalando postgres-operator, Crunchy PGO; any managed Redis). The internal StatefulSets exist so you can evaluate the chart on a laptop — no backups, no HA, no tuning.

## Routing contract

The frontend image bundles a Caddy that serves static files and reverse-proxies `/api/*`, `/federation/*`, `/.well-known/*`, `/users/*`, and `/ws/*` to the fixed hostname `backend:8000` (see `frontend/Caddyfile.internal`). Two consequences:

- The Ingress sends **all** traffic to the frontend Service — no path-splitting rules needed. Make sure your controller passes WebSocket upgrades on `/ws/*`.
- The chart creates an extra Service literally named `backend` in the release namespace (`frontend.backendAliasService`, default on), so run **one Theourgia release per namespace**.

The agent daemon is never exposed by the Ingress. All access goes through the backend's `/api/v1/agents/*` bridge — that is a security boundary, not an omission.

## Install

```bash
# From the repository root
helm install theourgia ./helm/theourgia \
  --namespace theourgia --create-namespace \
  --set secrets.secretKey="$(openssl rand -base64 64 | tr -d '\n')" \
  --set secrets.masterEncryptionKey="$(openssl rand -base64 64 | tr -d '\n')" \
  --set postgresql.external.url="postgresql+asyncpg://theourgia:PASSWORD@my-postgres:5432/theourgia" \
  --set redis.external.url="redis://my-redis:6379/0" \
  --set config.baseUrl="https://theourgia.example.com" \
  --set config.instanceId="theourgia.example.com"
```

Back up `secrets.masterEncryptionKey` outside the cluster immediately — losing it makes all server-side-encrypted (Mode A) content permanently unreadable. Better still, manage secrets yourself and pass `secrets.existingSecret` (expected keys are documented in `values.yaml`).

### Evaluation install (internal PostgreSQL + Redis)

The default `pre-install` migration hook runs before any release resource exists, so on a *first* install with the internal database the migration Job would wait for a database that is not there yet. Shift the first migration run to after install:

```bash
helm install theourgia ./helm/theourgia \
  --namespace theourgia --create-namespace \
  --set postgresql.internal.enabled=true \
  --set postgresql.internal.auth.password="an-evaluation-password" \
  --set redis.internal.enabled=true \
  --set migrations.hooks="post-install\,pre-upgrade" \
  --set secrets.secretKey="..." \
  --set secrets.masterEncryptionKey="..."
```

### Upgrade

```bash
helm upgrade theourgia ./helm/theourgia --namespace theourgia --reuse-values
```

Migrations run as a `pre-upgrade` hook; a failed migration Job is left in place for debugging.

## Values

Every value is documented inline in `values.yaml`; this table covers the ones most installs touch.

| Key | Default | Description |
|---|---|---|
| `config.env` | `production` | `THEOURGIA_ENV` |
| `config.baseUrl` | `https://theourgia.example.com` | Public base URL |
| `config.instanceId` | `theourgia.example.com` | Stable instance identifier |
| `config.allowedMagickalNames` | `""` | Signup allowlist; empty = open enrollment |
| `config.extraEnv` | `[]` | Extra env for backend + celery (storage, email, WebAuthn, ...) |
| `secrets.existingSecret` | `""` | Use your own Secret instead of chart-managed (keys in `values.yaml`) |
| `secrets.secretKey` | `""` | `THEOURGIA_SECRET_KEY` (required) |
| `secrets.masterEncryptionKey` | `""` | `THEOURGIA_MASTER_ENCRYPTION_KEY` (required; back it up) |
| `postgresql.external.url` | `""` | asyncpg DSN of your PostgreSQL (recommended) |
| `postgresql.internal.enabled` | `false` | Evaluation-only single-replica PostgreSQL |
| `redis.external.url` | `""` | Redis DSN (recommended) |
| `redis.internal.enabled` | `false` | Evaluation-only single-replica Redis |
| `backend.image.repository` | `ghcr.io/santonopoulou/theourgia-backend` | Tag defaults to chart `appVersion` |
| `backend.replicas` / `backend.workers` | `1` / `4` | Pods / uvicorn workers per pod |
| `celeryWorker.replicas` | `1` | Background job workers |
| `frontend.image.repository` | `ghcr.io/santonopoulou/theourgia-frontend` | |
| `frontend.replicas` | `1` | |
| `frontend.backendAliasService` | `true` | Creates the Service named `backend` the frontend Caddy expects |
| `agentDaemon.enabled` | `false` | Opt-in; also needs `agentDaemon.databaseUrl`, `secrets.agentControlToken`, `secrets.agentHkdfSalt` |
| `agentDaemon.persistence.enabled` | `true` | PVC for agent filesystem memory |
| `registry.enabled` | `false` | Opt-in; also needs `registry.databaseUrl` (+ S3 credentials via `registry.extraEnv`) |
| `ingress.enabled` | `false` | |
| `ingress.className` / `ingress.host` / `ingress.tls` | `""` / `theourgia.example.com` / `[]` | Standard Ingress fields |
| `ingress.registryHost` | `""` | Optional `plugins.<domain>` vhost (needs `registry.enabled`) |
| `migrations.enabled` | `true` | Alembic hook Job |
| `migrations.hooks` | `pre-install,pre-upgrade` | Set `post-install,pre-upgrade` for internal-PostgreSQL first installs |
| `image.pullPolicy` / `image.pullSecrets` | `IfNotPresent` / `[]` | Applied to all pods |

## What this chart does not do

- Host-level TLS and DNS (bring your own ingress controller + cert-manager).
- Backups. Configure restic via `config.extraEnv` (`RESTIC_REPOSITORY`, credentials) exactly as in `.env.example`, and read `docs/admin/disaster-recovery.md`.
- Production PostgreSQL/Redis (see above).
- Autoscaling, PodDisruptionBudgets, NetworkPolicies, ServiceMonitors. Contributions welcome.

## Validation

```bash
helm lint helm/theourgia
helm template helm/theourgia
```
