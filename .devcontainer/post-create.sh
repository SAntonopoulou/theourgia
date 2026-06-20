#!/usr/bin/env bash
# Post-create hook for the Theourgia devcontainer.
# Runs once after the container is first created.

set -euo pipefail

echo "→ installing backend dependencies via uv..."
cd /workspaces/theourgia/backend
uv sync --all-extras --dev 2>&1 | tail -5 || echo "  (uv sync produced warnings; continuing)"

echo "→ installing frontend dependencies via pnpm..."
cd /workspaces/theourgia
pnpm install 2>&1 | tail -5 || echo "  (pnpm install produced warnings; continuing)"

echo "→ installing pre-commit hooks..."
pre-commit install --install-hooks --hook-type pre-commit --hook-type commit-msg 2>&1 | tail -3 \
    || echo "  (pre-commit install reported warnings; continuing)"

echo "→ verifying git identity..."
bash /workspaces/theourgia/scripts/verify-identity.sh || {
    echo ""
    echo "  Git identity not on the SAntonopoulou allowlist. This is fine"
    echo "  for first-time contributors — set your own identity in this repo:"
    echo "      git config user.name '<your name>'"
    echo "      git config user.email '<your email>'"
    echo ""
}

echo ""
echo "✓ Theourgia devcontainer ready."
echo "  Try: just check    # lint + typecheck + test"
echo "       just dev      # bring up the full dev stack"
