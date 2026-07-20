# Theourgia backend image — multi-stage build.
#
# Targets:
#   base       — Python + system deps
#   deps       — production Python dependencies installed via uv
#   dev        — dev dependencies added + source mounted (for docker-compose.dev)
#   prod       — minimal runtime image with non-root user (default; for docker-compose.prod)
#
# Default target is `prod`. Override with --target dev in compose.

ARG PYTHON_VERSION=3.12

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — base
# ─────────────────────────────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim-bookworm AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# System dependencies:
#   - build-essential, libpq-dev: needed to compile some Python deps from source
#   - libpq5: postgres client lib at runtime
#   - curl: healthchecks + uv installer
#   - tini: signal-handling PID 1 in containers
#   - ca-certificates: TLS for outbound requests
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libpq5 \
        curl \
        tini \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Astral's Python package manager)
COPY --from=ghcr.io/astral-sh/uv:0.5.13 /uv /uvx /usr/local/bin/

WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps (production dependencies only)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps

# Copy only manifests for caching. README.md is referenced by
# pyproject.toml's [project].readme, so uv sync needs it present even
# before the rest of the source is copied.
COPY pyproject.toml uv.lock* README.md ./

# Sync production deps. Use --frozen if uv.lock exists; otherwise generate.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --no-install-project --frozen 2>/dev/null || uv sync --no-dev --no-install-project

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — dev (dev deps + full source, hot-reload friendly)
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS dev

# Add dev dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen 2>/dev/null || uv sync

# Source will be volume-mounted in docker-compose.dev.yml, but copy as a
# fallback so `docker run` of this image still works without compose.
COPY . .

ENV PATH="/app/.venv/bin:$PATH" \
    THEOURGIA_ENV=development

EXPOSE 8000

# Dev command: uvicorn with auto-reload
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — prod (minimal runtime, non-root, healthcheck)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim-bookworm AS prod

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# THEOURGIA_UID: the runtime user's uid/gid. Match it to the HOST user
# that owns the deploy directory so the backup mount (ro) is readable —
# 600-mode .env files are unreadable across a uid mismatch (v1-024).
ARG THEOURGIA_UID=1000

# Minimal runtime system deps. restic: the scheduled-backup task shells
# out to the restic binary (core/backups/restic.py) from the celery
# worker, which runs this same image. postgresql-client-16 (via PGDG —
# bookworm ships client 15, which refuses to dump a 16 server): the
# backup task's pg_dump pre-step (v1-023).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        tini \
        ca-certificates \
        curl \
        restic \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid ${THEOURGIA_UID} theourgia \
    && useradd --uid ${THEOURGIA_UID} --gid theourgia --shell /bin/bash --create-home theourgia \
    && install -d -o theourgia -g theourgia /var/spool/theourgia-backup

WORKDIR /app

# Pre-built virtualenv from the deps stage
COPY --from=deps --chown=theourgia:theourgia /app/.venv /app/.venv

# Application source. Excludes tests via .dockerignore patterns at build time;
# tests are present in the source tree but not generally needed in prod runtime.
COPY --chown=theourgia:theourgia . .

# Make ephemeris data dir explicit so users / docs know where it lives
RUN mkdir -p /app/data/ephe && chown theourgia:theourgia /app/data/ephe

USER theourgia

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    THEOURGIA_ENV=production

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/healthz || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Default target
FROM prod
