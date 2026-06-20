"""Alembic environment script for Theourgia.

Loads settings from the application's ``theourgia.core.config`` so that
the database URL, schema, and operational configuration come from a single
source of truth. Supports both online (live DB connection) and offline
(generate SQL) modes.

The migration role is preferred over the app role when running migrations:
the migration role has DDL privileges, the app role typically does not.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

# Import all models so SQLModel.metadata is populated for autogenerate.
from theourgia import models  # noqa: F401
from theourgia.core.config import get_settings

# Alembic Config object
config = context.config

# Configure Python logging per the ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata — what autogenerate compares the database to
target_metadata = SQLModel.metadata


def _resolve_database_url() -> str:
    """Pick the right URL for migrations.

    Preference: the explicit migration role URL (if set) over the app
    role URL. The migration role has DDL privileges; the app role
    generally does not in production.
    """
    settings = get_settings()
    if settings.migration_database_url is not None:
        return str(settings.migration_database_url)
    return str(settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL without connecting).

    Useful for CI dry-runs and for producing SQL bundles deployers can
    apply manually.
    """
    url = _resolve_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations against an open connection.

    Called from the async runner below; this is the synchronous body
    inside the async wrapper.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode against the live database."""
    configuration: dict[str, Any] = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _resolve_database_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online (live-DB) migrations."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
