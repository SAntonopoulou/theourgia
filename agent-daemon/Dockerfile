# Theourgia agent daemon image — multi-stage build.
#
# Stages match the backend Dockerfile shape so devcontainer + compose
# patterns are uniform across the three services (backend, daemon, registry).

ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim-bookworm AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libpq5 \
        curl \
        tini \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.13 /uv /uvx /usr/local/bin/
WORKDIR /app

FROM base AS deps
COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --no-install-project 2>/dev/null || uv sync --no-dev --no-install-project

FROM deps AS dev
RUN --mount=type=cache,target=/root/.cache/uv uv sync 2>/dev/null || uv sync
COPY . .
ENV PATH="/app/.venv/bin:$PATH" \
    THEOURGIA_AGENT_ENV=development
EXPOSE 8002
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia_agent.api.app:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]

FROM python:${PYTHON_VERSION}-slim-bookworm AS prod
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        tini \
        ca-certificates \
        curl \
        bubblewrap \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1100 daemon-svc \
    && useradd --uid 1100 --gid daemon-svc --shell /bin/bash --create-home daemon-svc
# bubblewrap is the filesystem sandbox tool the daemon shells out to;
# subprocess writes get bounded via `bwrap --bind <memory-dir> /work`.
WORKDIR /app
COPY --from=deps --chown=daemon-svc:daemon-svc /app/.venv /app/.venv
COPY --chown=daemon-svc:daemon-svc . .
# Memory root for agent filesystems (rule 59 — write sandbox base).
RUN mkdir -p /srv/theourgia/agents && chown daemon-svc:daemon-svc /srv/theourgia/agents
USER daemon-svc
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    THEOURGIA_AGENT_ENV=production
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8002/health || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia_agent.api.app:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "2"]

FROM prod
