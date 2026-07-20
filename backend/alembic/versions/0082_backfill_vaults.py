"""Backfill a default vault for every user that lacks one.

No schema change — data only. Until v1-030 nothing ever created a
Vault, so existing installs (including production) have users with no
vault, and every vault-scoped surface (federation actor, key rotation,
per-vault voces) is inert. This gives each vault-less user one default
vault whose slug derives from the user's email local part, deduped
against the global unique slug constraint.

The sign-in path (v1-030) provisions vaults going forward and is
idempotent; this migration repairs accounts that exist already.

Uses ``sa.text()`` with named bindparams throughout: alembic runs
migrations over asyncpg (see ``env.py``), whose paramstyle is ``$1``
positional — the psycopg ``%(name)s`` style fails there (v1-030b).

Revision ID: 0082
Revises: 0081
Create Date: 2026-07-20
"""

from __future__ import annotations

import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0082"
down_revision: Union[str, None] = "0081"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slug(name: str) -> str:
    s = _SLUG_RE.sub("-", name.lower()).strip("-")
    return (s or "vault")[:48]


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT u.id, u.email
            FROM "user" u
            WHERE NOT EXISTS (
                SELECT 1 FROM vault v WHERE v.owner_id = u.id
            )
            """
        )
    ).fetchall()

    taken = {
        r[0]
        for r in bind.execute(sa.text("SELECT slug FROM vault")).fetchall()
    }

    insert = sa.text(
        """
        INSERT INTO vault
            (id, owner_id, slug, display_name, description,
             public_face_enabled, created_at, updated_at)
        VALUES
            (gen_random_uuid(), :owner, :slug, :disp, '',
             false, now(), now())
        """
    )

    for user_id, email in rows:
        local = (email or "").split("@", 1)[0]
        base = _slug(local)
        slug = base
        n = 1
        while slug in taken:
            n += 1
            slug = f"{base}-{n}"
        taken.add(slug)
        bind.execute(
            insert,
            {"owner": user_id, "slug": slug, "disp": local or slug},
        )


def downgrade() -> None:
    # Vaults are load-bearing once created (content references them);
    # deleting backfilled vaults on downgrade would orphan data. No-op.
    pass
