# Deploying on Kubernetes

Theourgia ships a community-supported Helm chart at [`helm/theourgia/`](../../helm/theourgia/) in the repository. This document tells you when to use it, how to use it, and — just as important — when not to.

**Docker Compose is the primary deployment path.** The compose stack (`docker-compose.yml` + `docker-compose.prod.yml`) is what the maintainer runs, what the disaster-recovery runbook assumes, and what gets tested on every release. A single small VPS (4 vCPU / 8 GB RAM) runs the whole thing comfortably. If you are choosing a deployment method from scratch, choose Compose.

Use the Helm chart when you *already* operate Kubernetes — you have a cluster, an ingress controller, a database story, and the operational muscle memory to debug a CrashLoopBackOff at 2 a.m. The chart will not teach you Kubernetes, and Kubernetes-specific issues are triaged best-effort.

## What the chart deploys

The chart mirrors the compose topology, service for service:

- **backend** — FastAPI on port 8000, with readiness (`/readyz`) and liveness (`/healthz`) probes
- **celery-worker** — background jobs, same image as the backend
- **celery-beat** — the scheduler; pinned to a single replica with a `Recreate` strategy because two beats double-fire every scheduled job
- **frontend** — the static site plus its bundled Caddy on port 80
- **migrations** — an `alembic upgrade head` Job run as a Helm hook before installs and upgrades
- **agent-daemon** (opt-in, default off) — AI agent supervision; requires its own database, never exposed outside the cluster
- **registry** (opt-in, default off) — a self-hosted plugin registry; most instances should use plugins.theourgia.com instead

## What the chart deliberately does not deploy

**A production database.** PostgreSQL and Redis are your job. Point `postgresql.external.url` and `redis.external.url` at a managed service or an operator-managed cluster (CloudNativePG, Zalando postgres-operator, or Crunchy PGO for Postgres; any managed Redis). The chart includes single-replica internal StatefulSets behind `postgresql.internal.enabled` / `redis.internal.enabled`, but they exist so you can evaluate the chart on a laptop — no backups, no failover, no tuning. Do not put a vault you care about on them.

**Backups.** The restic pipeline is configured through environment variables (`RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, S3 credentials) passed via `config.extraEnv`, the same variables `.env.example` documents for Compose. Read the [disaster recovery runbook](./disaster-recovery.md) before you need it, and write the `RESTIC_PASSWORD` and `THEOURGIA_MASTER_ENCRYPTION_KEY` down on paper, outside the cluster. **Without the master encryption key, a restored database still cannot decrypt Mode A content.**

**TLS and DNS.** Bring your own ingress controller and cert-manager. The chart's Ingress (off by default) routes every path to the frontend service; the frontend's bundled Caddy does the path split between static files, `/api`, federation routes, and `/ws` websockets — exactly as it does behind the host Caddy in the Compose deployment.

## Quick start

```bash
git clone https://github.com/SAntonopoulou/theourgia.git
cd theourgia

helm install theourgia ./helm/theourgia \
  --namespace theourgia --create-namespace \
  --set secrets.secretKey="$(openssl rand -base64 64 | tr -d '\n')" \
  --set secrets.masterEncryptionKey="$(openssl rand -base64 64 | tr -d '\n')" \
  --set postgresql.external.url="postgresql+asyncpg://theourgia:PASSWORD@your-postgres:5432/theourgia" \
  --set redis.external.url="redis://your-redis:6379/0" \
  --set config.baseUrl="https://theourgia.example.com" \
  --set config.instanceId="theourgia.example.com"
```

Then verify, the same checks as §6 of the disaster-recovery runbook:

```bash
kubectl -n theourgia get pods
kubectl -n theourgia exec deploy/theourgia-backend -- curl -fs http://localhost:8000/readyz
kubectl -n theourgia exec deploy/theourgia-backend -- curl -fs http://localhost:8000/api/v1/meta
```

For real installs, do not pass secrets on the command line: manage a Secret yourself (sealed-secrets, external-secrets, SOPS — whatever your cluster already uses) and hand its name to the chart via `secrets.existingSecret`. The expected keys are documented at the top of [`values.yaml`](../../helm/theourgia/values.yaml).

## Things that will bite you if you skip the README

- **One release per namespace.** The frontend image's internal Caddy proxies API traffic to the fixed hostname `backend:8000`, so the chart creates a Service literally named `backend`. Two releases in one namespace fight over it.
- **Internal-Postgres first install needs a different hook.** The default migration hook is `pre-install`, which runs before the internal StatefulSet exists. Pass `--set migrations.hooks="post-install\,pre-upgrade"` on the first install if you enabled `postgresql.internal.enabled`. External databases (the recommended path) are unaffected.
- **The master encryption key is forever.** Same rule as every other Theourgia deployment: if `THEOURGIA_MASTER_ENCRYPTION_KEY` is lost, Mode A content is gone. Sealed (Mode B) content survives — it only ever decrypts in users' browsers.
- **The agent daemon needs its own database.** If you enable `agentDaemon.enabled`, give it a separate PostgreSQL database (`agentDaemon.databaseUrl`), never the vault's. Daemon failures must not be able to poison the vault. The daemon is intentionally unreachable through the Ingress.

## Upgrades

```bash
helm upgrade theourgia ./helm/theourgia --namespace theourgia --reuse-values
```

Alembic migrations run as a `pre-upgrade` hook before new pods roll. A failed migration Job stays behind for debugging:

```bash
kubectl -n theourgia logs job/theourgia-migrations
```

The chart's `appVersion` tracks the Theourgia release; image tags default to it, so upgrading the chart upgrades the application unless you pin tags explicitly.

## Getting help

The full values reference lives in [`helm/theourgia/README.md`](../../helm/theourgia/README.md) and inline in `values.yaml`. For problems, file an issue on the GitHub repository with the `kubernetes` label, and include `helm version`, the chart version, your values (secrets redacted), and `kubectl describe` output for the failing resource. Chart improvements — PodDisruptionBudgets, NetworkPolicies, ServiceMonitors, autoscaling — are welcome as pull requests.
