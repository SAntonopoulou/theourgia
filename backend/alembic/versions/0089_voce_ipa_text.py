"""Widen voce_magicae.ipa from VARCHAR(480) to unbounded TEXT.

The 480-char cap on IPA used to abort a whole voces sync when a phone
carried a longer narrow transcription (stress, tone, length marks, or a
multi-word vox) — the phone imposes no such cap. Citation stays capped;
only ipa is widened. See the pre-launch audit's voces finding.

Chained off the committed head 0087c. The uncommitted talisman migration
also numbered 0088 branches from 0087b, so once BOTH land alembic will
show two heads (this 0089 and that 0088) and want a single merge
revision — a reconciliation for whoever commits the talisman work.

Revision ID: 0089_voce_ipa_text
Revises: 0087c
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0089_voce_ipa_text"
down_revision: Union[str, None] = "0087c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "voce_magicae",
        "ipa",
        existing_type=sa.String(length=480),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Reversible only where no row already exceeds 480 chars; a longer IPA
    # would be truncated by the narrowing, so the down-migration is here
    # for completeness rather than as a safe round-trip.
    op.alter_column(
        "voce_magicae",
        "ipa",
        existing_type=sa.Text(),
        type_=sa.String(length=480),
        existing_nullable=True,
    )
