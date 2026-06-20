#!/usr/bin/env bash
# Theourgia dev-preview deploy.
#
# Builds both frontend apps (public-site Astro + admin React SPA) and
# ships them to https://dev.theourgia.com on the shared-Caddy host.
#
# Usage:
#   pnpm deploy:dev                     # build + ship + verify
#   pnpm deploy:dev -- --skip-build     # ship the existing dist/ as-is
#   pnpm deploy:dev -- --skip-verify    # skip the curl health-check
#
# Environment overrides (defaults in [brackets]):
#   THEOURGIA_DEPLOY_HOST     [178.105.106.225]
#   THEOURGIA_DEPLOY_USER     [theourgia]
#   THEOURGIA_DEPLOY_KEY      [$HOME/.ssh/agent-house-access-theourgia]
#   THEOURGIA_DEPLOY_ROOT     [/srv/theourgia/dev]
#   THEOURGIA_DEPLOY_URL      [https://dev.theourgia.com]

set -euo pipefail

# ─── config ─────────────────────────────────────────────────────────────────

HOST="${THEOURGIA_DEPLOY_HOST:-178.105.106.225}"
USER="${THEOURGIA_DEPLOY_USER:-theourgia}"
KEY="${THEOURGIA_DEPLOY_KEY:-$HOME/.ssh/agent-house-access-theourgia}"
REMOTE_ROOT="${THEOURGIA_DEPLOY_ROOT:-/srv/theourgia/dev}"
PROBE_URL="${THEOURGIA_DEPLOY_URL:-https://dev.theourgia.com}"

# When set, the frontend build sees ``VITE_THEOURGIA_API_BASE`` and the
# admin SPA switches the API client from mock fixtures to live calls.
# Default matches the live deploy; set to "" or "mock" to force mock mode.
THEOURGIA_API_BASE_DEFAULT="${THEOURGIA_API_BASE:-https://dev.theourgia.com}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIST="$REPO_ROOT/frontend/public-site/dist"
ADMIN_DIST="$REPO_ROOT/frontend/admin/dist"

# ─── flags ──────────────────────────────────────────────────────────────────

SKIP_BUILD=0
SKIP_VERIFY=0
for arg in "$@"; do
    case "$arg" in
        --)            ;;  # pnpm passes a literal `--` separator; ignore it
        --skip-build)  SKIP_BUILD=1 ;;
        --skip-verify) SKIP_VERIFY=1 ;;
        --help|-h)
            sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0 ;;
        *)
            echo "deploy-dev: unknown argument: $arg" >&2
            echo "  see --help" >&2
            exit 2 ;;
    esac
done

# ─── pre-flight ─────────────────────────────────────────────────────────────

step()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

step "pre-flight"
[[ -r "$KEY" ]] || fail "SSH key not readable: $KEY (set THEOURGIA_DEPLOY_KEY)"
command -v ssh   >/dev/null || fail "ssh not found"
command -v tar   >/dev/null || fail "tar not found"
command -v curl  >/dev/null || fail "curl not found"
command -v pnpm  >/dev/null || fail "pnpm not found"
ok "tooling + ssh key found"

SSH_OPTS=(-i "$KEY" -o BatchMode=yes -o ConnectTimeout=10)
ssh "${SSH_OPTS[@]}" "$USER@$HOST" 'echo connected' >/dev/null \
    || fail "ssh to $USER@$HOST failed (try `ssh -i $KEY $USER@$HOST` manually)"
ok "ssh to $USER@$HOST"

# ─── build ──────────────────────────────────────────────────────────────────

if [[ $SKIP_BUILD -eq 0 ]]; then
    step "build public-site + admin"
    # Pass the API base to Vite. Empty string = mock mode in the admin SPA.
    api_base="$THEOURGIA_API_BASE_DEFAULT"
    if [[ "$api_base" == "mock" ]]; then api_base=""; fi
    echo "    VITE_THEOURGIA_API_BASE=${api_base:-<mock>}"
    (cd "$REPO_ROOT" \
        && VITE_THEOURGIA_API_BASE="$api_base" \
           pnpm --filter @theourgia/admin --filter @theourgia/public-site build) \
        || fail "build failed"
    ok "both apps built"
else
    step "skipping build (--skip-build)"
fi

[[ -d "$PUBLIC_DIST" ]] || fail "public-site dist missing: $PUBLIC_DIST"
[[ -d "$ADMIN_DIST"  ]] || fail "admin dist missing: $ADMIN_DIST"

# ─── ship ───────────────────────────────────────────────────────────────────

ship() {
    local local_dist="$1" remote_subdir="$2"
    local remote_path="$REMOTE_ROOT/$remote_subdir"
    step "ship $remote_subdir → $USER@$HOST:$remote_path"
    (cd "$local_dist" && tar cz .) | ssh "${SSH_OPTS[@]}" "$USER@$HOST" "
        set -e
        sudo mkdir -p '$remote_path'
        sudo chown $USER:$USER '$remote_path'
        cd '$remote_path'
        find . -mindepth 1 -delete
        tar xz
        sudo chmod -R a+rX '$remote_path'
        find . -type f | wc -l
    " | { read -r count; ok "shipped $count files"; }
}

ship "$PUBLIC_DIST" public
ship "$ADMIN_DIST"  admin

# ─── verify ─────────────────────────────────────────────────────────────────

if [[ $SKIP_VERIFY -eq 0 ]]; then
    step "verify $PROBE_URL"
    # Bypass local resolver in case it hasn't picked up the record — go via
    # Cloudflare DNS-over-HTTPS, then pin to whichever edge IP we get.
    edge_ip="$(curl -sS "https://1.1.1.1/dns-query?name=${PROBE_URL#https://}&type=A" \
        -H "Accept: application/dns-json" \
        | python3 -c 'import json,sys; r=json.load(sys.stdin); print(r["Answer"][0]["data"])')"
    [[ -n "$edge_ip" ]] || fail "could not resolve ${PROBE_URL} via 1.1.1.1"

    probe() {
        local path="$1"
        local code
        code=$(curl -sSL --max-time 15 \
            --resolve "${PROBE_URL#https://}:443:$edge_ip" \
            -o /dev/null -w "%{http_code}" \
            "$PROBE_URL$path")
        if [[ "$code" == "200" ]]; then
            ok "  $path → HTTP 200"
        else
            fail "  $path → HTTP $code"
        fi
    }
    probe "/"
    probe "/foundations/"
    probe "/admin/"
else
    step "skipping verify (--skip-verify)"
fi

step "done"
echo "  open: $PROBE_URL/"
echo "  open: $PROBE_URL/foundations/"
echo "  open: $PROBE_URL/admin/"
