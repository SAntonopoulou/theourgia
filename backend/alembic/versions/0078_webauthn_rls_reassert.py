"""Re-assert RLS on webauthn_credential.

Databases that took 0066's recreate path (after the 2026-07-05 deploy
recovery dropped the 0006 table out-of-band) are missing the
row-level-security policy that 0006 attached. Idempotently restore it
so every database — fresh replay or incrementally migrated — ends in
the same state: RLS enabled with the owner read/write policy.

Revision ID: 0078
Revises: 0077
Create Date: 2026-07-16
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0078"
down_revision: Union[str, None] = "0077"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ENABLE is idempotent; the policy needs an existence check because
    # Postgres has no CREATE POLICY IF NOT EXISTS.
    op.execute("ALTER TABLE webauthn_credential ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'webauthn_credential'
                  AND policyname = 'webauthn_credential_owner_rw'
            ) THEN
                CREATE POLICY webauthn_credential_owner_rw ON webauthn_credential
                    FOR ALL
                    USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
                    WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # Leave RLS in place — removing a security policy on downgrade would
    # be strictly worse than a no-op.
    pass
