#!/usr/bin/env bash
# Theourgia production deploy.
#
# Runs ON the production host (e.g., theourgia.com). Pulls the latest
# code, rebuilds containers, dumps the main DB, runs migrations,
# restarts services.
#
# Pre-requisites (the runbook covers these):
#   - Docker + docker compose plugin installed
#   - .env populated (use `scripts/first-run.sh` for initial bootstrap)
#   - Repository cloned at $THEOURGIA_DEPLOY_ROOT (default /srv/theourgia/prod)
#   - Host Caddy reverse-proxying theourgia.com → 127.0.0.1:8190
#
# By default only the core stack deploys (postgres, redis, backend,
# celery, celery-beat, frontend). The auxiliary services are parked
# behind compose profiles — enable them via THEOURGIA_PROFILES:
#   THEOURGIA_PROFILES="agents"              → agent-daemon + its DB
#   THEOURGIA_PROFILES="marketplace"         → plugin registry + its DB
#   THEOURGIA_PROFILES="agents marketplace"  → both
#
# Usage:
#   ./scripts/deploy-prod.sh [--skip-pull] [--skip-build] [--skip-migrate] [--skip-dump]
#
# Environment overrides:
#   THEOURGIA_DEPLOY_ROOT   [/srv/theourgia/prod]
#   THEOURGIA_BRANCH        [main]
#   THEOURGIA_PROFILES      [] (space/comma separated: agents, marketplace)

set -euo pipefail

REPO_ROOT="${THEOURGIA_DEPLOY_ROOT:-/srv/theourgia/prod}"
BRANCH="${THEOURGIA_BRANCH:-main}"
COMPOSE_FILES=("docker-compose.yml" "docker-compose.prod.yml")
PROFILES_RAW="${THEOURGIA_PROFILES:-}"

SKIP_PULL=0
SKIP_BUILD=0
SKIP_MIGRATE=0
SKIP_DUMP=0
for arg in "$@"; do
    case "$arg" in
        --skip-pull)    SKIP_PULL=1 ;;
        --skip-build)   SKIP_BUILD=1 ;;
        --skip-migrate) SKIP_MIGRATE=1 ;;
        --skip-dump)    SKIP_DUMP=1 ;;
        --help|-h)
            sed -n '2,28p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0 ;;
        *)
            echo "deploy-prod: unknown argument: $arg" >&2
            exit 2 ;;
    esac
done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ─── profiles ───────────────────────────────────────────────────────────────

# Normalise THEOURGIA_PROFILES (commas or spaces) into an array and a
# lookup helper. Unknown profile names are rejected up front.
PROFILES=()
for p in ${PROFILES_RAW//,/ }; do
    case "$p" in
        agents|marketplace) PROFILES+=("$p") ;;
        *) fail "unknown profile in THEOURGIA_PROFILES: $p (valid: agents, marketplace)" ;;
    esac
done

profile_active() {
    local want="$1" p
    for p in "${PROFILES[@]:-}"; do
        [[ "$p" == "$want" ]] && return 0
    done
    return 1
}

# ─── pre-flight ─────────────────────────────────────────────────────────────

step "pre-flight"
[[ -d "$REPO_ROOT" ]] || fail "deploy root does not exist: $REPO_ROOT"
cd "$REPO_ROOT"

[[ -f .env ]] || fail "no .env at $REPO_ROOT (run scripts/first-run.sh first)"
command -v docker >/dev/null || fail "docker not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not installed"
ok "docker + compose available"

# Validate that required secrets are present. Core secrets always;
# auxiliary secrets only when their profile is enabled.
CORE_SECRETS=(
    THEOURGIA_SECRET_KEY
    THEOURGIA_MASTER_ENCRYPTION_KEY
    THEOURGIA_DB_PASSWORD
)
REQUIRED_SECRETS=("${CORE_SECRETS[@]}")
if profile_active agents; then
    REQUIRED_SECRETS+=(
        THEOURGIA_AGENT_DB_PASSWORD
        THEOURGIA_AGENT_CONTROL_TOKEN
        THEOURGIA_AGENT_HKDF_SALT
    )
fi
if profile_active marketplace; then
    REQUIRED_SECRETS+=(THEOURGIA_REGISTRY_DB_PASSWORD)
fi
for var in "${REQUIRED_SECRETS[@]}"; do
    grep -q "^$var=." .env || fail "$var unset in .env (run scripts/first-run.sh to regenerate)"
done
if [[ ${#PROFILES[@]} -gt 0 ]]; then
    ok "required secrets present in .env (profiles: ${PROFILES[*]})"
else
    ok "required secrets present in .env (core only, no profiles)"
fi

COMPOSE_ARGS=()
for f in "${COMPOSE_FILES[@]}"; do
    COMPOSE_ARGS+=("-f" "$f")
done
for p in "${PROFILES[@]:-}"; do
    [[ -n "$p" ]] && COMPOSE_ARGS+=("--profile" "$p")
done

# ─── pull ───────────────────────────────────────────────────────────────────

if [[ $SKIP_PULL -eq 0 ]]; then
    step "git pull origin $BRANCH"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
    ok "code synced"
else
    step "skipping pull (--skip-pull)"
fi

# ─── build ──────────────────────────────────────────────────────────────────

if [[ $SKIP_BUILD -eq 0 ]]; then
    step "build images"
    docker compose "${COMPOSE_ARGS[@]}" build
    ok "images built"
else
    step "skipping build (--skip-build)"
fi

# ─── pre-migration dump ─────────────────────────────────────────────────────
# Belt-and-braces safety net: before touching the schema, take a manual
# pg_dump of the MAIN database into backups-manual/. Restic snapshots
# also contain a dump, but this one is local, immediate, and taken at
# the exact pre-migration state. Prune old ones by hand when disk fills.

if [[ $SKIP_MIGRATE -eq 0 && $SKIP_DUMP -eq 0 ]]; then
    step "pre-migration pg_dump → backups-manual/"
    mkdir -p "$REPO_ROOT/backups-manual"
    DUMP_NAME="pre-migrate-$(date +%Y%m%d-%H%M%S).dump"
    # Run pg_dump inside the backend image (postgresql-client is baked
    # in for the backup pipeline); DATABASE_URL is asyncpg-flavoured, so
    # strip the driver suffix for libpq. compose run starts postgres if
    # it isn't up yet (depends_on: service_healthy).
    docker compose "${COMPOSE_ARGS[@]}" run --rm --no-TTY \
        -v "$REPO_ROOT/backups-manual:/backups-manual" \
        backend sh -c \
        'pg_dump "$(printf %s "$DATABASE_URL" | sed "s/+asyncpg//")" -Fc -f "/backups-manual/'"$DUMP_NAME"'"' \
        || fail "pre-migration pg_dump failed — refusing to migrate without a fallback dump (use --skip-dump to override)"
    [[ -s "$REPO_ROOT/backups-manual/$DUMP_NAME" ]] \
        || fail "pre-migration dump is missing or empty: backups-manual/$DUMP_NAME"
    ok "dump written: backups-manual/$DUMP_NAME"
elif [[ $SKIP_MIGRATE -eq 0 ]]; then
    step "skipping pre-migration dump (--skip-dump)"
fi

# ─── migrate ────────────────────────────────────────────────────────────────

if [[ $SKIP_MIGRATE -eq 0 ]]; then
    step "alembic upgrade head — backend"
    docker compose "${COMPOSE_ARGS[@]}" run --rm backend \
        alembic upgrade head
    ok "backend migrations applied"

    if profile_active agents; then
        step "alembic upgrade head — agent-daemon"
        docker compose "${COMPOSE_ARGS[@]}" run --rm agent-daemon \
            alembic upgrade head
        ok "agent-daemon migrations applied"
    else
        step "skipping agent-daemon migrations (agents profile not enabled)"
    fi

    if profile_active marketplace; then
        step "alembic upgrade head — registry"
        docker compose "${COMPOSE_ARGS[@]}" run --rm registry \
            alembic upgrade head
        ok "registry migrations applied"
    else
        step "skipping registry migrations (marketplace profile not enabled)"
    fi
else
    step "skipping migrations (--skip-migrate)"
fi

# ─── restart ────────────────────────────────────────────────────────────────

step "rolling restart"
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans
ok "services restarted"

# ─── verify ─────────────────────────────────────────────────────────────────

step "verify"
VERIFY_SERVICES=(backend)
profile_active agents && VERIFY_SERVICES+=(agent-daemon)
profile_active marketplace && VERIFY_SERVICES+=(registry)
for service in "${VERIFY_SERVICES[@]}"; do
    state=$(docker compose "${COMPOSE_ARGS[@]}" ps --format json "$service" \
        | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["State"] if isinstance(d,list) else d["State"])' 2>/dev/null || echo "missing")
    if [[ "$state" == "running" ]]; then
        ok "  $service: $state"
    else
        fail "  $service: $state"
    fi
done

step "done"
echo "  monitor with: docker compose ${COMPOSE_ARGS[*]} logs -f"
