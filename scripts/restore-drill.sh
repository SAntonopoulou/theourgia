#!/usr/bin/env bash
# Theourgia — backup restore drill (NON-DESTRUCTIVE).
#
# "A backup you have never restored is a hope, not a backup."
#
# Exercises the real disaster-recovery path against the live restic
# repository WITHOUT touching the live database or any live container:
#
#   1. Lists snapshots in the restic repository (read-only).
#   2. Restores the latest snapshot (or --snapshot ID) into a temp dir.
#   3. Validates the pg_dump archive inside it with `pg_restore --list`.
#   4. With --load: starts a THROWAWAY postgres container
#      (theourgia-restore-test, loopback port 55432 by default), loads
#      the dump into it, and counts rows in the key tables
#      (entry, "user").
#   5. Prints a PASS/FAIL summary and cleans everything up.
#
# The drill only ever READS from the restic repo and writes to a temp
# dir + a throwaway container. It never connects to the live postgres
# service, never uses the live compose project, and never runs restic
# forget/prune.
#
# Config comes from the same .env the deploy uses (RESTIC_REPOSITORY,
# RESTIC_PASSWORD, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
# AWS_DEFAULT_REGION).
#
# Usage:
#   ./scripts/restore-drill.sh [--load] [--full] [--keep] \
#       [--snapshot ID] [--env-file PATH]
#
#   --load          also load the dump into a throwaway postgres and
#                   count rows (slower; the most complete drill)
#   --full          restore the whole snapshot, not just the DB dump dir
#   --keep          keep the temp dir + throwaway container afterwards
#   --snapshot ID   restore a specific snapshot instead of "latest"
#   --env-file P    read config from P instead of <repo>/.env
#
# Environment overrides:
#   THEOURGIA_DEPLOY_ROOT   [/srv/theourgia/prod]  (where .env lives)
#   RESTORE_TEST_PORT       [55432]  host loopback port for --load
#   RESTORE_WORKDIR         [/tmp]   parent dir for the restore temp dir

set -euo pipefail

REPO_ROOT="${THEOURGIA_DEPLOY_ROOT:-/srv/theourgia/prod}"
ENV_FILE="$REPO_ROOT/.env"
SNAPSHOT_ID="latest"
DO_LOAD=0
FULL_RESTORE=0
KEEP=0
RESTORE_TEST_PORT="${RESTORE_TEST_PORT:-55432}"
RESTORE_WORKDIR="${RESTORE_WORKDIR:-/tmp}"
TEST_CONTAINER="theourgia-restore-test"
# Where the celery worker's pre-backup pg_dump lands inside every
# snapshot (see backend/theourgia/core/tasks/backup.py::_dump_database).
SPOOL_PATH="/var/spool/theourgia-backup"
DUMP_BASENAME="theourgia-db.dump"
# Same image as the live DB — the dump contains CREATE EXTENSION vector,
# which plain postgres images cannot restore.
PG_IMAGE="pgvector/pgvector:pg16"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --load)     DO_LOAD=1; shift ;;
        --full)     FULL_RESTORE=1; shift ;;
        --keep)     KEEP=1; shift ;;
        --snapshot) SNAPSHOT_ID="${2:?--snapshot needs an ID}"; shift 2 ;;
        --env-file) ENV_FILE="${2:?--env-file needs a path}"; shift 2 ;;
        --help|-h)
            sed -n '2,41p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0 ;;
        *)
            echo "restore-drill: unknown argument: $1" >&2
            exit 2 ;;
    esac
done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; summary FAIL "$*"; exit 1; }

RESULT_NOTES=()
summary() {
    local verdict="$1"; shift || true
    printf '\n\033[1m════ RESTORE DRILL %s ════\033[0m\n' "$verdict"
    local note
    for note in "${RESULT_NOTES[@]:-}"; do
        [[ -n "$note" ]] && printf '  %s\n' "$note"
    done
    [[ $# -gt 0 && -n "${1:-}" ]] && printf '  failed at: %s\n' "$1"
}

# ─── config from .env ───────────────────────────────────────────────────────

[[ -f "$ENV_FILE" ]] || { echo "no env file at $ENV_FILE" >&2; exit 1; }

envval() {
    local line
    line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1 || true)
    line="${line#*=}"
    # strip one layer of surrounding quotes if present
    line="${line%\"}"; line="${line#\"}"
    line="${line%\'}"; line="${line#\'}"
    printf '%s' "$line"
}

RESTIC_REPOSITORY="$(envval RESTIC_REPOSITORY)"
RESTIC_PASSWORD="$(envval RESTIC_PASSWORD)"
AWS_ACCESS_KEY_ID="$(envval AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY="$(envval AWS_SECRET_ACCESS_KEY)"
AWS_DEFAULT_REGION="$(envval AWS_DEFAULT_REGION)"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
export RESTIC_REPOSITORY RESTIC_PASSWORD \
    AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION

[[ -n "$RESTIC_REPOSITORY" ]] || { echo "RESTIC_REPOSITORY unset in $ENV_FILE" >&2; exit 1; }
[[ -n "$RESTIC_PASSWORD"   ]] || { echo "RESTIC_PASSWORD unset in $ENV_FILE" >&2; exit 1; }

# ─── tooling: host binaries preferred, docker fallback ──────────────────────

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

WORKDIR="$(mktemp -d "$RESTORE_WORKDIR/theourgia-restore-drill.XXXXXX")"
RESTORE_DIR="$WORKDIR/restored"
mkdir -p "$RESTORE_DIR"

run_restic() {
    if command -v restic >/dev/null 2>&1; then
        restic "$@"
    else
        # Official restic image; run as the invoking user so restored
        # files stay deletable, and mount the workdir at the same path
        # so --target values are identical in both modes. A local-path
        # repository (rare; prod uses R2) must be mounted too.
        local mounts=(-v "$WORKDIR:$WORKDIR")
        [[ "$RESTIC_REPOSITORY" == /* ]] \
            && mounts+=(-v "$RESTIC_REPOSITORY:$RESTIC_REPOSITORY")
        docker run --rm --user "$(id -u):$(id -g)" \
            -e RESTIC_REPOSITORY -e RESTIC_PASSWORD \
            -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
            "${mounts[@]}" \
            restic/restic --no-cache "$@"
    fi
}

run_pg_restore_list() {
    local dump="$1"
    if command -v pg_restore >/dev/null 2>&1; then
        pg_restore --list "$dump"
    else
        docker run --rm -v "$WORKDIR:$WORKDIR:ro" "$PG_IMAGE" \
            pg_restore --list "$dump"
    fi
}

# shellcheck disable=SC2317  # invoked via trap, not directly
cleanup() {
    if [[ $KEEP -eq 1 ]]; then
        warn "--keep: leaving $WORKDIR and container $TEST_CONTAINER in place"
        return
    fi
    docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
    rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# ─── 1. list snapshots ──────────────────────────────────────────────────────

step "restic snapshots (repository: $RESTIC_REPOSITORY)"
run_restic snapshots --compact || fail "could not list snapshots — check RESTIC_* / AWS_* in $ENV_FILE"
SNAP_COUNT=$(run_restic snapshots --json | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[[ "$SNAP_COUNT" -gt 0 ]] || fail "repository contains zero snapshots — backups are NOT running"
RESULT_NOTES+=("snapshots in repository: $SNAP_COUNT")
ok "$SNAP_COUNT snapshot(s) found"

# ─── 2. restore ─────────────────────────────────────────────────────────────

step "restore snapshot '$SNAPSHOT_ID' → $RESTORE_DIR"
RESTORE_ARGS=(restore "$SNAPSHOT_ID" --target "$RESTORE_DIR")
if [[ $FULL_RESTORE -eq 0 ]]; then
    # Only the DB dump dir by default — the DR-critical artifact —
    # which keeps the drill fast. --full restores everything.
    RESTORE_ARGS+=(--include "$SPOOL_PATH")
fi
run_restic "${RESTORE_ARGS[@]}" || fail "restic restore failed"
ok "restore completed"

DUMP_FILE="$RESTORE_DIR$SPOOL_PATH/$DUMP_BASENAME"
if [[ ! -f "$DUMP_FILE" ]]; then
    # Path layout changed? Search before giving up.
    DUMP_FILE="$(find "$RESTORE_DIR" -name "$DUMP_BASENAME" -type f | head -n1 || true)"
fi
[[ -n "$DUMP_FILE" && -s "$DUMP_FILE" ]] \
    || fail "no $DUMP_BASENAME found in restored snapshot — the backup does NOT contain a database dump"
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
RESULT_NOTES+=("dump file: $DUMP_FILE ($DUMP_SIZE)")
ok "found dump: $DUMP_FILE ($DUMP_SIZE)"

# ─── 3. validate the dump archive ───────────────────────────────────────────

step "pg_restore --list (archive integrity)"
TOC_LINES=$(run_pg_restore_list "$DUMP_FILE" | wc -l) \
    || fail "pg_restore --list failed — dump archive is corrupt or truncated"
[[ "$TOC_LINES" -gt 0 ]] || fail "pg_restore --list produced an empty table of contents"
RESULT_NOTES+=("archive TOC entries: $TOC_LINES")
ok "dump archive is a valid pg_dump custom-format archive ($TOC_LINES TOC lines)"

# ─── 4. optional: load into a throwaway postgres ────────────────────────────

if [[ $DO_LOAD -eq 1 ]]; then
    step "load into throwaway postgres ($TEST_CONTAINER, 127.0.0.1:$RESTORE_TEST_PORT)"
    docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
    THROWAWAY_PW="$(openssl rand -hex 16 2>/dev/null || echo "drill-$$-$RANDOM")"
    docker run -d --name "$TEST_CONTAINER" \
        -e POSTGRES_PASSWORD="$THROWAWAY_PW" \
        -e POSTGRES_DB=restore_test \
        -p "127.0.0.1:$RESTORE_TEST_PORT:5432" \
        -v "$WORKDIR:$WORKDIR:ro" \
        "$PG_IMAGE" >/dev/null

    # The postgres entrypoint restarts the server mid-init, so a single
    # pg_isready success can race it — require two in a row.
    printf '  waiting for postgres'
    READY=0
    STREAK=0
    for _ in $(seq 1 60); do
        if docker exec "$TEST_CONTAINER" pg_isready -U postgres -d restore_test >/dev/null 2>&1; then
            STREAK=$((STREAK + 1))
            [[ $STREAK -ge 2 ]] && { READY=1; break; }
        else
            STREAK=0
        fi
        printf '.'; sleep 1
    done
    printf '\n'
    [[ $READY -eq 1 ]] || fail "throwaway postgres did not become ready in 60s"

    # --no-owner/--no-privileges: original roles don't exist here.
    # pg_restore exits non-zero on ignorable warnings too, so record
    # rather than abort — the row counts below are the real check.
    if docker exec "$TEST_CONTAINER" \
        pg_restore -U postgres -d restore_test --no-owner --no-privileges \
        "$DUMP_FILE" 2>"$WORKDIR/pg_restore.err"; then
        ok "dump loaded cleanly"
    else
        ERRS=$(grep -c 'error:' "$WORKDIR/pg_restore.err" || true)
        warn "pg_restore finished with warnings/errors ($ERRS 'error:' lines) — see $WORKDIR/pg_restore.err (use --keep)"
        RESULT_NOTES+=("pg_restore warnings/errors: $ERRS line(s)")
    fi

    count_rows() {
        docker exec "$TEST_CONTAINER" \
            psql -U postgres -d restore_test -tA -c "SELECT count(*) FROM $1;"
    }
    ENTRY_COUNT=$(count_rows 'entry')      || fail "could not count rows in entry — restore is unusable"
    USER_COUNT=$(count_rows '"user"')      || fail "could not count rows in \"user\" — restore is unusable"
    RESULT_NOTES+=("rows restored — entry: $ENTRY_COUNT, user: $USER_COUNT")
    ok "row counts — entry: $ENTRY_COUNT, user: $USER_COUNT"
    if [[ "$USER_COUNT" -eq 0 ]]; then
        warn "0 users in the restored dump — fine on a fresh instance, alarming on a live one"
    fi
else
    RESULT_NOTES+=("throwaway-load skipped (run with --load for the full drill)")
fi

# ─── 5. summary ─────────────────────────────────────────────────────────────

summary PASS
exit 0
