#!/usr/bin/env bash
# Theourgia identity guard — verify the local git config uses an allowed
# maintainer identity before committing.
#
# Run via: just verify-identity
# Or hook into your shell prompt / pre-commit if you want it automatic.
#
# This protects against the failure mode of `git config user.email` being
# accidentally set to an unrelated identity from another project, resulting
# in commits attributed to the wrong GitHub account.

set -euo pipefail

ALLOWED_EMAILS=(
    "santonopoulou@protonmail.com"
    "s.willowood@acg.edu"
    "sophia@opaseltd.com"
)

current_name=$(git config user.name 2>/dev/null || echo "")
current_email=$(git config user.email 2>/dev/null || echo "")

if [[ -z "$current_email" ]]; then
    echo "ERROR: no git user.email configured in this repo." >&2
    exit 1
fi

for allowed in "${ALLOWED_EMAILS[@]}"; do
    if [[ "$current_email" == "$allowed" ]]; then
        echo "✓ identity OK — ${current_name} <${current_email}>"
        exit 0
    fi
done

echo "ERROR: git user.email is '${current_email}'" >&2
echo "       This is NOT on the allowlist for SAntonopoulou/theourgia." >&2
echo "Allowed emails: ${ALLOWED_EMAILS[*]}" >&2
echo "" >&2
echo "Fix with:" >&2
echo "    git config user.email <one-of-the-allowed-emails>" >&2
echo "    git config user.name 'Soror Ευ. Α.'" >&2
exit 1
