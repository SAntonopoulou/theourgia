"""Device link codes — a short code that proves "this account is mine".

## Why this exists

A companion application (the first is **astropractise**, Sophia's Hellenistic
astrology app) needs to link a user's account there to their account here. The
existing route was ``GET /api/v1/me`` with the user's *theourgia session token*
in the header, which works for a browser and does not work for a phone: a
mobile app has no way to obtain a theourgia session token that does not involve
either an embedded login form (asking a user to type their theourgia password
into a third-party app — exactly the habit every phishing attack relies on) or
a full OAuth authorisation-code implementation, which neither side has.

So instead: **the user reads a short code on theourgia and types it into the
app.** The relying party redeems it server-to-server. The user's session token
never leaves theourgia, and no password is typed anywhere but here.

## The shape

1. The user, signed in here, asks for a code for a named audience.
2. We show them eight characters. They are live for ten minutes.
3. They type it into the app. The app sends it to *its own* server.
4. That server calls ``POST /api/v1/link-codes/redeem`` with its client
   credentials and the code, and receives the user's id.
5. The code is burned.

## Decisions that are load-bearing

**Hash-stored, like every other credential in this table's neighbourhood.** The
plaintext exists in the response that issued it and in the user's short-term
memory. A database reader cannot redeem what they can read.

**Bound to an audience.** A code minted for astropractise cannot be redeemed by
any other relying party, so a user who is convinced to read a code aloud has
leaked something narrower than an account.

**Single use, and superseding.** Minting a code invalidates the user's earlier
unredeemed codes for the same audience — a code left visible on a screen the
user has since walked away from stops working the moment they ask for another.

**Eight characters is enough because redemption is credentialed.** The alphabet
below is 31 characters, so a code is about 39.6 bits. Guessing one blind would
be hard anyway; guessing one *while holding a registered relying party's client
secret* is the actual attack, and there is no such thing as an anonymous
guesser at this endpoint.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["LinkCode"]


class LinkCode(IDMixin, TimestampMixin, table=True):
    """A short-lived, single-use code that identifies its owner to one client."""

    __tablename__ = "link_code"
    __table_args__ = (
        # The lookup that matters: find this user's live codes for one
        # audience, to supersede them at mint time.
        Index("ix_link_code_user_audience", "user_id", "audience", "redeemed_at"),
        Index("ix_link_code_expiry", "expires_at_utc"),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    code_hash: str = Field(
        sa_column=Column(String(64), unique=True, nullable=False),
        description="SHA-256 hex of the normalised code (uppercase, no hyphens)",
    )

    audience: str = Field(
        sa_column=Column(String(64), nullable=False),
        description=(
            "The client id this code may be redeemed by. A code minted for "
            "one relying party is useless to another."
        ),
    )

    expires_at_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="Server-fixed at mint time; the client cannot ask for longer.",
    )

    redeemed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Set on the one successful redemption; null means unused.",
    )

    superseded_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description=(
            "Set when the same user minted a newer code for the same "
            "audience. Distinct from redeemed_at so the audit trail can tell "
            "'they used it' from 'they asked again'."
        ),
    )
