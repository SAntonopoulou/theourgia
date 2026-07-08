"""Comment — visitor commentary on a publication or blog entry.

b108-2gw · FEATURES §2 (blog) + §12 (publications) closes the
"Comments with moderation — per-post opt-in" checkbox.

Design notes:

* **Per-target opt-in.** Publications and Entries carry a
  ``comments_enabled`` boolean. When false, POST /comments returns
  409 CONFLICT — no per-item allowlist to manage, no accidental
  spam surface.
* **Moderation queue by default.** Every comment starts in state
  ``PENDING``. The owner (auth-required) transitions to APPROVED,
  REJECTED, or SPAM. Only APPROVED comments render in the reader.
* **No account required.** Visitors supply name + optional email.
  Email is never rendered publicly by default; kept for moderator
  identity + follow-up.
* **Anti-spam.** Rate-limit at the substrate; honeypot on the form
  (empty field submits go straight to SPAM); IP address logged for
  audit only.
* **Owner-scoped.** target_id + target_kind resolve to a row whose
  owner_id the moderator matches; owner_id is denormalised onto the
  Comment row at write time so the moderation queue query is a
  simple filter.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin


__all__ = ["Comment", "CommentState", "CommentTargetKind"]


class CommentTargetKind(str, enum.Enum):
    ENTRY = "entry"
    PUBLICATION = "publication"


class CommentState(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SPAM = "spam"


class Comment(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "comment"
    __table_args__ = (
        Index("ix_comment_target", "target_kind", "target_id"),
        Index("ix_comment_owner_state", "owner_id", "state"),
    )

    target_kind: CommentTargetKind = Field(
        sa_column=Column(
            SQLEnum(
                CommentTargetKind,
                name="comment_target_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    target_id: UUID = Field(nullable=False)
    # Denormalised owner_id from the target row — makes the
    # moderation queue trivial to filter on and lets us gate
    # DELETE/PATCH cheaply.
    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    author_name: str = Field(max_length=120, nullable=False)
    author_email: Optional[str] = Field(default=None, max_length=320)
    author_url: Optional[str] = Field(default=None, max_length=480)
    body: str = Field(sa_column=Column(Text, nullable=False))

    state: CommentState = Field(
        default=CommentState.PENDING,
        sa_column=Column(
            SQLEnum(
                CommentState,
                name="comment_state",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=CommentState.PENDING.value,
        ),
    )
    moderator_note: Optional[str] = Field(
        default=None, sa_column=Column(Text)
    )
    ip_address: Optional[str] = Field(default=None, max_length=64)
