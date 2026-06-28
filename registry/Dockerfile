# Theourgia plugin registry image — multi-stage build.
#
# Mirrors the backend + daemon Dockerfile shape. Listens on 8003 by default
# (the third Theourgia service in the local port range; backend=8000,
# daemon=8002, registry=8003).

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
    THEOURGIA_REGISTRY_ENV=development
EXPOSE 8003
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia_registry.api.app:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]

FROM python:${PYTHON_VERSION}-slim-bookworm AS prod
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        tini \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1200 registry-svc \
    && useradd --uid 1200 --gid registry-svc --shell /bin/bash --create-home registry-svc
WORKDIR /app
COPY --from=deps --chown=registry-svc:registry-svc /app/.venv /app/.venv
COPY --chown=registry-svc:registry-svc . .
USER registry-svc
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    THEOURGIA_REGISTRY_ENV=production
EXPOSE 8003
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8003/health || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "theourgia_registry.api.app:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "2"]

FROM prod
