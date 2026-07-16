#!/usr/bin/env bash
# Theourgia one-command bootstrap installer.
#
# Brings a fresh Linux host from nothing to a running production
# Theourgia stack:
#
#   1. Installs Docker Engine + compose plugin if missing (via the
#      official get.docker.com script — prompted, unless --yes).
#   2. Clones the repository to /srv/theourgia/prod (override: --dir).
#   3. Runs scripts/first-run.sh to mint .env secrets (skipped when a
#      .env already exists).
#   4. Builds + starts the stack: docker compose -f docker-compose.yml
#      -f docker-compose.prod.yml up -d --build
#   5. Applies alembic migrations to all three databases (backend,
#      agent-daemon, registry) the same way scripts/deploy-prod.sh does.
#   6. Waits for the backend /readyz probe, then prints next steps
#      (Caddy, first-run wizard, backups).
#
# Idempotent — safe to re-run. An existing checkout is updated with
# --ff-only, an existing .env is kept, builds and migrations are no-ops
# when already current.
#
# Recommended invocation (download, read, then run — we do not ask you
# to pipe the network straight into your shell):
#   curl -fsSL https://raw.githubusercontent.com/SAntonopoulou/theourgia/main/scripts/install.sh -o install.sh
#   less install.sh
#   bash install.sh
#
# Usage:
#   install.sh [--yes] [--dir <path>] [--branch <ref>] [--no-docker-install]
#
# Flags:
#   --yes                answer yes to all prompts (non-interactive)
#   --dir <path>         install directory        [/srv/theourgia/prod]
#   --branch <ref>       git branch / tag to deploy             [main]
#   --no-docker-install  never install Docker; fail if it is missing
#
# Environment overrides:
#   THEOURGIA_REPO         [https://github.com/SAntonopoulou/theourgia]
#   THEOURGIA_INSTALL_DIR  same as --dir
#   THEOURGIA_BRANCH       same as --branch

set -euo pipefail

REPO_URL="${THEOURGIA_REPO:-https://github.com/SAntonopoulou/theourgia}"
INSTALL_DIR="${THEOURGIA_INSTALL_DIR:-/srv/theourgia/prod}"
BRANCH="${THEOURGIA_BRANCH:-main}"
ASSUME_YES=0
NO_DOCKER_INSTALL=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --yes)               ASSUME_YES=1 ;;
        --no-docker-install) NO_DOCKER_INSTALL=1 ;;
        --dir)               [[ $# -ge 2 ]] || { echo "install: --dir needs a value" >&2; exit 2; }
                             INSTALL_DIR="$2"; shift ;;
        --branch)            [[ $# -ge 2 ]] || { echo "install: --branch needs a value" >&2; exit 2; }
                             BRANCH="$2"; shift ;;
        --help|-h)           sed -n '2,43p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)                   echo "install: unknown argument: $1 (see --help)" >&2; exit 2 ;;
    esac
    shift
done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

confirm() {
    # Prompt for yes/no on the controlling terminal (stdin may be the
    # script itself when fetched-and-piped). --yes answers everything.
    [[ $ASSUME_YES -eq 1 ]] && return 0
    [[ -e /dev/tty ]] || fail "no terminal to prompt on — re-run with --yes"
    local reply
    read -r -p "$1 [y/N] " reply < /dev/tty
    [[ "$reply" =~ ^[Yy]$ ]]
}

as_root() {
    # Run a command as root, via sudo when we are not already root.
    if [[ ${EUID} -eq 0 ]]; then "$@"; else sudo "$@"; fi
}

compose() {
    as_root docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
}

# ─── pre-flight ─────────────────────────────────────────────────────────────

step "pre-flight"

if [[ ${EUID} -ne 0 ]] && ! command -v sudo >/dev/null; then
    fail "run as root, or install sudo — the installer needs privileges for Docker and $INSTALL_DIR"
fi

DISTRO_ID="unknown"
if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    DISTRO_ID="${ID:-unknown}"
fi
case "$DISTRO_ID" in
    debian|ubuntu|raspbian)
        ok "detected $DISTRO_ID — fully supported" ;;
    *)
        warn "detected '$DISTRO_ID' — Theourgia targets Debian/Ubuntu; continuing best-effort."
        warn "get.docker.com supports most mainstream distros; everything after Docker is distro-agnostic." ;;
esac

command -v curl >/dev/null || fail "curl not installed — install it first (apt install curl)"

if ! command -v git >/dev/null; then
    if command -v apt-get >/dev/null; then
        step "installing git"
        as_root apt-get update -qq
        as_root apt-get install -y -qq git
    else
        fail "git not installed and no apt available — install git with your package manager, then re-run"
    fi
fi
ok "curl + git available"

# ─── docker ─────────────────────────────────────────────────────────────────

step "docker"

if command -v docker >/dev/null && as_root docker compose version >/dev/null 2>&1; then
    ok "docker + compose plugin already installed"
elif [[ $NO_DOCKER_INSTALL -eq 1 ]]; then
    fail "docker (with the compose plugin) is missing and --no-docker-install was given"
else
    echo "Docker Engine + the compose plugin are required and not installed."
    echo "The installer uses Docker's official convenience script from https://get.docker.com"
    confirm "Download and run the get.docker.com install script as root?" \
        || fail "declined Docker install — install Docker yourself, then re-run with --no-docker-install"
    # Download to a file first so a truncated transfer can never execute
    # half a script.
    GET_DOCKER="$(mktemp)"
    curl -fsSL https://get.docker.com -o "$GET_DOCKER"
    as_root sh "$GET_DOCKER"
    rm -f "$GET_DOCKER"
    as_root docker compose version >/dev/null 2>&1 \
        || fail "docker installed but the compose plugin is missing — install docker-compose-plugin manually"
    ok "docker + compose plugin installed"
fi

# ─── clone / update ─────────────────────────────────────────────────────────

step "repository → $INSTALL_DIR (branch: $BRANCH)"

if [[ -d "$INSTALL_DIR/.git" ]]; then
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
    ok "existing checkout updated"
elif [[ -e "$INSTALL_DIR" ]] && [[ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]]; then
    fail "$INSTALL_DIR exists and is not a git checkout — pick another --dir or move it aside"
else
    as_root mkdir -p "$INSTALL_DIR"
    as_root chown "$(id -u):$(id -g)" "$INSTALL_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    ok "cloned $REPO_URL"
fi

cd "$INSTALL_DIR"

# ─── .env secrets ───────────────────────────────────────────────────────────

step "secrets"

if [[ -f .env ]]; then
    ok ".env already present — keeping it (move it aside to re-mint secrets)"
else
    ./scripts/first-run.sh
fi

# ─── build + start ──────────────────────────────────────────────────────────

step "build + start (docker compose up -d --build)"
compose up -d --build
ok "stack started"

# ─── migrations (same three databases as deploy-prod.sh) ───────────────────

for svc in backend agent-daemon registry; do
    step "alembic upgrade head — $svc"
    compose run --rm "$svc" alembic upgrade head
    ok "$svc migrations applied"
done

# ─── wait for readiness ─────────────────────────────────────────────────────

step "waiting for backend /readyz"

# The backend has no host port binding in prod (loopback-only frontend is
# the entry point), so probe from inside the container. curl ships in the
# backend image (it powers the compose healthcheck).
DEADLINE=$((SECONDS + 180))
until compose exec -T backend curl -fsS http://localhost:8000/readyz >/dev/null 2>&1; do
    if (( SECONDS >= DEADLINE )); then
        fail "backend not ready after 180s — inspect: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend"
    fi
    sleep 5
done
ok "backend is ready"

# ─── next steps ─────────────────────────────────────────────────────────────

step "done"
cat <<EOF

────────────────────────────────────────────────────────────────────────
Theourgia is running at $INSTALL_DIR. What's left is yours to decide:

1. Finish .env — first-run.sh listed the values that need manual input
   (BASE_URL, instance id, R2 + Stripe + restic credentials). Edit
   $INSTALL_DIR/.env then apply with: ./scripts/deploy-prod.sh --skip-pull

2. TLS + domain — copy the reference Caddy config and adapt it:
     $INSTALL_DIR/Caddyfile.example  →  /etc/caddy/Caddyfile
   Full walkthrough: docs/ops/DEPLOYMENT_RUNBOOK.md (§2 + §4).
   The stack listens on host loopback only (127.0.0.1:8190 frontend,
   127.0.0.1:8193 registry); Caddy is what exposes it to the world.

3. First-run wizard — once your domain resolves, open:
     https://<your-domain>/app/setup
   (before TLS: http://127.0.0.1:8190/app/setup from the host)

4. Backups — set RESTIC_REPOSITORY + RESTIC_PASSWORD (+ S3 credentials)
   in .env. Write the restic password down OUTSIDE this machine; without
   it backups are unrecoverable. See docs/admin/disaster-recovery.md.

5. Optional monitoring — Prometheus + Grafana starter kit:
     deploy/monitoring/README.md
   When something breaks: docs/admin/runbooks.md
────────────────────────────────────────────────────────────────────────

EOF
