"""Database engine and session management.

Async SQLAlchemy / SQLModel atop asyncpg. One engine per process; sessions
are short-lived and per-request. The FastAPI dependency
:func:`get_session` yields an :class:`AsyncSession` and ensures rollback on
exception.

Connection details come from :class:`theourgia.core.config.Settings`. The
``app`` role connects via DATABASE_URL; the ``migration`` role (for
Alembic) connects via THEOURGIA_MIGRATION_DATABASE_URL if set.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from theourgia.core.config import get_settings

__all__ = [
    "get_engine",
    "get_session",
    "get_sessionmaker",
    "session_scope",
    "task_session_scope",
]


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Return the process-wide async engine.

    Cached on first access. The engine pool is owned by this module and
    survives for the lifetime of the process; do not dispose it from app
    code outside of test teardown.
    """
    settings = get_settings()
    return create_async_engine(
        str(settings.database_url),
        echo=False,  # SQL logging via structlog if needed, not via engine
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle_seconds,
        future=True,
    )


@lru_cache(maxsize=1)
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Return the process-wide async session factory.

    Configured with ``expire_on_commit=False`` so that ORM objects remain
    usable after commit (the FastAPI/SQLModel idiomatic shape).
    """
    return async_sessionmaker(
        bind=get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding a request-scoped session.

    Usage::

        @app.get("/whatever")
        async def handler(session: AsyncSession = Depends(get_session)) -> ...:
            ...

    Commits are explicit. If an exception escapes, the session is rolled
    back; otherwise it is closed cleanly on exit.
    """
    async with get_sessionmaker()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Async context manager for code outside FastAPI request scope.

    Workers (Celery tasks, scripts, scheduled jobs) use this to obtain a
    short-lived session::

        async with session_scope() as session:
            ...
            await session.commit()

    Behaves identically to :func:`get_session` but is usable outside of
    FastAPI dependency injection.

    NOTE: Celery tasks must use :func:`task_session_scope` instead —
    this scope's pooled engine binds to one event loop, and the
    asyncio.run-per-task pattern crosses loops.
    """
    async with get_sessionmaker()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def task_session_scope() -> AsyncIterator[AsyncSession]:
    """Session scope for Celery tasks and other asyncio.run-per-call code.

    The process-wide engine from :func:`get_engine` binds its connection
    pool to the first event loop that uses it. Celery tasks each call
    ``asyncio.run`` — a fresh loop per invocation — so pooled asyncpg
    connections cross loops and raise ``attached to a different loop``
    (observed live the first time the worker ever ran, v1-022). This
    scope builds a loop-local engine with no pool and disposes it before
    the loop closes. Commit remains the caller's responsibility, same as
    :func:`session_scope`.
    """
    from sqlalchemy.pool import NullPool

    settings = get_settings()
    engine = create_async_engine(
        str(settings.database_url),
        echo=False,
        poolclass=NullPool,
        future=True,
    )
    try:
        maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        async with maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    finally:
        await engine.dispose()


async def dispose_engine() -> None:
    """Dispose the process-wide engine.

    Used by test teardown and graceful shutdown. After calling, the next
    call to :func:`get_engine` will rebuild the engine.
    """
    engine = get_engine()
    await engine.dispose()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
