# Theourgia frontend image — multi-stage build.
#
# Builds the Astro public site and the React admin SPA, then serves the
# combined static output via an internal Caddy that also reverse-proxies
# /api/* to the backend container.
#
# Targets:
#   deps       — pnpm install of all workspaces
#   build      — runs production builds for public-site and admin
#   dev-deps   — pnpm install (dev mode)
#   public-site-dev — Astro dev server
#   admin-dev      — Vite dev server for admin
#   prod       — Caddy serving built static files (default)
#
# Default target is `prod`.

ARG NODE_VERSION=22
ARG PNPM_VERSION=9.15.0
ARG CADDY_VERSION=2.11-alpine

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — base (Node + pnpm + corepack)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps (install all workspaces)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY frontend/shared/package.json frontend/shared/
COPY frontend/public-site/package.json frontend/public-site/
COPY frontend/admin/package.json frontend/admin/
COPY docs/package.json* docs/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile 2>/dev/null \
    || pnpm install

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — build (production bundles)
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS build

# Bring in the rest of the source after deps install for cacheability
COPY tsconfig.json biome.json ./
COPY frontend frontend
COPY docs docs

# Build the public site and admin SPA
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @theourgia/public-site build \
    && pnpm --filter @theourgia/admin build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — dev shells (used by docker-compose.dev.yml)
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS public-site-dev
WORKDIR /app
EXPOSE 4321
CMD ["pnpm", "--filter", "@theourgia/public-site", "dev", "--host", "0.0.0.0"]

FROM deps AS admin-dev
WORKDIR /app
EXPOSE 5173
CMD ["pnpm", "--filter", "@theourgia/admin", "dev", "--host", "0.0.0.0"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 5 — prod (Caddy serving built statics + reverse-proxying /api/*)
# ─────────────────────────────────────────────────────────────────────────────
FROM caddy:${CADDY_VERSION} AS prod

# Copy built outputs to where Caddy will serve them.
# Public site at /, admin SPA at /app/*.
COPY --from=build /app/frontend/public-site/dist /srv/public-site
COPY --from=build /app/frontend/admin/dist /srv/admin

# Internal routing Caddyfile. /api/* and /federation/* go to the backend
# container on its compose-network address; everything else falls through
# to the static file server with /app/* hitting the admin SPA.
COPY frontend/Caddyfile.internal /etc/caddy/Caddyfile

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

# Default target
FROM prod
