#!/usr/bin/env bash
# Theourgia first-run bootstrap.
#
# Generates a fresh .env from .env.example, populating the required
# secrets with cryptographically strong defaults. Idempotent: if .env
# already exists, prints a warning and exits without overwriting.
#
# Run this ONCE on a new production host after cloning the repo and
# BEFORE the first `scripts/deploy-prod.sh`.
#
# Usage:
#   ./scripts/first-run.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

step "first-run"

if [[ -f .env ]]; then
    fail ".env already exists — refusing to overwrite. To regenerate, move it aside first."
fi

[[ -f .env.example ]] || fail ".env.example not found"

command -v openssl >/dev/null || fail "openssl not installed"

# Generate secrets
SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n')
MASTER_ENC_KEY=$(openssl rand -base64 64 | tr -d '\n')
DB_PASS=$(openssl rand -hex 32)
AGENT_DB_PASS=$(openssl rand -hex 32)
REGISTRY_DB_PASS=$(openssl rand -hex 32)
AGENT_CONTROL_TOKEN=$(openssl rand -base64 48 | tr -d '\n')
HKDF_SALT=$(openssl rand -hex 32)

cp .env.example .env

# Populate the required secrets. POSIX sed substitution is awkward
# with multi-line / special-char values; use a Python helper for
# safety against accidental regex metacharacters.
python3 - <<PY
import re
from pathlib import Path

substitutions = {
    "THEOURGIA_SECRET_KEY": "$SECRET_KEY",
    "THEOURGIA_MASTER_ENCRYPTION_KEY": "$MASTER_ENC_KEY",
    "THEOURGIA_DB_PASSWORD": "$DB_PASS",
    "THEOURGIA_AGENT_DB_PASSWORD": "$AGENT_DB_PASS",
    "THEOURGIA_REGISTRY_DB_PASSWORD": "$REGISTRY_DB_PASS",
    "THEOURGIA_AGENT_DAEMON_CONTROL_TOKEN": "$AGENT_CONTROL_TOKEN",
    "THEOURGIA_AGENT_CONTROL_TOKEN": "$AGENT_CONTROL_TOKEN",
    "THEOURGIA_AGENT_HKDF_SALT": "$HKDF_SALT",
}

env_path = Path(".env")
text = env_path.read_text()
for key, value in substitutions.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        text = pattern.sub(f"{key}={value}", text)
    else:
        text += f"\n{key}={value}\n"
env_path.write_text(text)
print("OK")
PY

chmod 600 .env
ok "generated .env with cryptographically strong secrets (mode 0600)"

cat <<EOF

────────────────────────────────────────────────────────────────────────
.env has been written to $REPO_ROOT/.env

The following fields STILL need manual configuration before deploy:
  · THEOURGIA_BASE_URL          — your public site URL (no trailing slash)
  · THEOURGIA_INSTANCE_ID       — typically the host part of BASE_URL
  · ANTHROPIC_API_KEY           — Claude API key (BYO; operator-level default)
  · STRIPE_API_KEY / SECRET     — for Phase 10 publishing payouts
  · RESTIC_REPOSITORY / PASSWORD — for Phase 01 backup tooling
  · AWS_ACCESS_KEY_ID / SECRET  — for R2 / object storage (Phase 11 media)
  · CLOUDFLARE_API_TOKEN        — for Caddy DNS-01 ACME challenge
  · THEOURGIA_REGISTRY_BOOTSTRAP_MAINTAINER_DID — your DID for first LEAD

After editing .env, run:
  ./scripts/deploy-prod.sh

For the full setup procedure including DNS, Caddy, and TLS, see:
  docs/ops/DEPLOYMENT_RUNBOOK.md
────────────────────────────────────────────────────────────────────────

EOF
