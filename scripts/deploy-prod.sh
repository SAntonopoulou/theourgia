#!/usr/bin/env bash
# Theourgia production deploy.
#
# Runs ON the production host (e.g., theourgia.com). Pulls the latest
# code, rebuilds containers, runs migrations on all three databases,
# restarts services.
#
# Pre-requisites (the runbook covers these):
#   - Docker + docker compose plugin installed
#   - .env populated (use `scripts/first-run.sh` for initial bootstrap)
#   - Repository cloned at $THEOURGIA_DEPLOY_ROOT (default /srv/theourgia/prod)
#   - Host Caddy reverse-proxying theourgia.com → 127.0.0.1:8190
#     + plugins.theourgia.com → 127.0.0.1:8193
#
# Usage:
#   ./scripts/deploy-prod.sh [--skip-pull] [--skip-build] [--skip-migrate]
#
# Environment overrides:
#   THEOURGIA_DEPLOY_ROOT   [/srv/theourgia/prod]
#   THEOURGIA_BRANCH        [main]
#   THEOURGIA_COMPOSE_FILES [docker-compose.yml docker-compose.prod.yml]

set -euo pipefail

REPO_ROOT="${THEOURGIA_DEPLOY_ROOT:-/srv/theourgia/prod}"
BRANCH="${THEOURGIA_BRANCH:-main}"
COMPOSE_FILES=("docker-compose.yml" "docker-compose.prod.yml")

SKIP_PULL=0
SKIP_BUILD=0
SKIP_MIGRATE=0
for arg in "$@"; do
    case "$arg" in
        --skip-pull)    SKIP_PULL=1 ;;
        --skip-build)   SKIP_BUILD=1 ;;
        --skip-migrate) SKIP_MIGRATE=1 ;;
        --help|-h)
            sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0 ;;
        *)
            echo "deploy-prod: unknown argument: $arg" >&2
            exit 2 ;;
    esac
done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ─── pre-flight ─────────────────────────────────────────────────────────────

step "pre-flight"
[[ -d "$REPO_ROOT" ]] || fail "deploy root does not exist: $REPO_ROOT"
cd "$REPO_ROOT"

[[ -f .env ]] || fail "no .env at $REPO_ROOT (run scripts/first-run.sh first)"
command -v docker >/dev/null || fail "docker not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not installed"
ok "docker + compose available"

# Validate that required secrets are present.
for var in \
    THEOURGIA_SECRET_KEY \
    THEOURGIA_MASTER_ENCRYPTION_KEY \
    THEOURGIA_DB_PASSWORD \
    THEOURGIA_AGENT_DB_PASSWORD \
    THEOURGIA_AGENT_CONTROL_TOKEN \
    THEOURGIA_AGENT_HKDF_SALT \
    THEOURGIA_REGISTRY_DB_PASSWORD
do
    grep -q "^$var=." .env || fail "$var unset in .env (run scripts/first-run.sh to regenerate)"
done
ok "required secrets present in .env"

COMPOSE_ARGS=()
for f in "${COMPOSE_FILES[@]}"; do
    COMPOSE_ARGS+=("-f" "$f")
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

# ─── migrate ────────────────────────────────────────────────────────────────

if [[ $SKIP_MIGRATE -eq 0 ]]; then
    step "alembic upgrade head — backend"
    docker compose "${COMPOSE_ARGS[@]}" run --rm backend \
        alembic upgrade head
    ok "backend migrations applied"

    step "alembic upgrade head — agent-daemon"
    docker compose "${COMPOSE_ARGS[@]}" run --rm agent-daemon \
        alembic upgrade head
    ok "agent-daemon migrations applied"

    step "alembic upgrade head — registry"
    docker compose "${COMPOSE_ARGS[@]}" run --rm registry \
        alembic upgrade head
    ok "registry migrations applied"
else
    step "skipping migrations (--skip-migrate)"
fi

# ─── restart ────────────────────────────────────────────────────────────────

step "rolling restart"
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans
ok "services restarted"

# ─── verify ─────────────────────────────────────────────────────────────────

step "verify"
for service in backend agent-daemon registry; do
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
