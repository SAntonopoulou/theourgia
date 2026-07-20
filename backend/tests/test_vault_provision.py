"""v1-030 — vault provisioning at sign-in.

Found by the twin-instance federation test: nothing created a Vault, so
a fresh install had a User but no vault and every vault-scoped surface
(federation actor by slug, key rotation, per-vault voces) was inert.
Production had exactly this shape (1 user, 0 vaults).
"""

from __future__ import annotations

import asyncio
import os

import pytest

from theourgia.core.vaults.provision import vault_slug

DB_URL = os.environ.get("THEOURGIA_TEST_DATABASE_URL", "")


def test_vault_slug_is_url_safe():
    assert vault_slug("Soror Ευ. Α.") != ""
    assert vault_slug("Frater  Test  Name") == "frater-test-name"
    assert vault_slug("!!!") == "vault"
    assert " " not in vault_slug("a b c")
    assert vault_slug("x" * 100) == "x" * 48


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_ensure_vault_is_idempotent_and_unique(monkeypatch):
    from uuid import uuid4

    monkeypatch.setenv("DATABASE_URL", DB_URL)
    from theourgia.core import config

    config.get_settings.cache_clear()
    from theourgia.core.db import task_session_scope
    from theourgia.core.vaults import ensure_vault
    from theourgia.models.identity import User

    async def run() -> None:
        async with task_session_scope() as session:
            u1 = User(email=f"prov-{uuid4().hex[:8]}@t.test")
            u2 = User(email=f"prov-{uuid4().hex[:8]}@t.test")
            session.add(u1)
            session.add(u2)
            await session.flush()

            v1 = await ensure_vault(
                session, owner_id=u1.id,
                display_name="One", slug_hint="shared-name",
            )
            # Second call for the same owner returns the same vault.
            v1_again = await ensure_vault(
                session, owner_id=u1.id,
                display_name="One", slug_hint="shared-name",
            )
            assert v1.id == v1_again.id

            # A different owner with the same hint gets a deduped slug.
            v2 = await ensure_vault(
                session, owner_id=u2.id,
                display_name="Two", slug_hint="shared-name",
            )
            assert v2.slug != v1.slug
            assert v2.slug.startswith("shared-name")

            await session.rollback()

    asyncio.run(run())
    config.get_settings.cache_clear()
