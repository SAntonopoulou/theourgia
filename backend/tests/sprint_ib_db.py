"""Shared live-Postgres harness for the Sprint I-B HTTP round-trip tests.

Same opt-in shape as the rest of the suite: tests that import this
module skip unless ``THEOURGIA_TEST_DATABASE_URL`` names a database
already migrated to head (0087). Each test signs in a fresh demo user
so ladder/covenant state never bleeds between tests.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from uuid import uuid4

DB_URL = os.environ.get("THEOURGIA_TEST_DATABASE_URL", "")


@asynccontextmanager
async def signed_in_client(monkeypatch):
    """Yield an httpx client wired to a fresh app on the live test DB,
    already signed in (session cookie) as a brand-new demo user."""
    monkeypatch.setenv("DATABASE_URL", DB_URL)
    monkeypatch.setenv("THEOURGIA_ENV", "test")

    from theourgia.core import config
    from theourgia.core import db as core_db

    config.get_settings.cache_clear()
    core_db.get_engine.cache_clear()
    core_db.get_sessionmaker.cache_clear()

    from httpx import ASGITransport, AsyncClient

    from theourgia.api.app import create_app

    app = create_app()
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            # https so the Secure session cookie is echoed back.
            base_url="https://testserver",
        ) as client:
            r = await client.post(
                "/api/v1/auth/demo-signin",
                json={"magickal_name": f"ib-{uuid4().hex[:10]}"},
            )
            assert r.status_code == 200, r.text
            yield client
    finally:
        # Hand back clean process-wide state for whatever runs next.
        await core_db.get_engine().dispose()
        config.get_settings.cache_clear()
        core_db.get_engine.cache_clear()
        core_db.get_sessionmaker.cache_clear()
