"""Day One journal importer endpoint — b108-2hk.

FEATURES §13 · reference plugin (Day One journal importer).

Accepts a Day One JSON export payload, parses it, creates one Entry
per usable row. Returns a summary of what was imported vs skipped
(honesty by construction — the reader sees what did and didn't
survive the round-trip).
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.imports.day_one import parse_day_one_export
from theourgia.models.entries import Entry, EntryType, EntryVisibility

__all__ = ["router"]

router = APIRouter()


class DayOneImportPayload(BaseModel):
    """Raw Day One JSON export handed to the importer."""

    model_config = ConfigDict(extra="allow")

    entries: list[dict[str, Any]] = Field(default_factory=list)


class DayOneImportResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_entries: int
    imported: int
    skipped: int
    skipped_reasons: list[str]
    entry_ids: list[str]


@router.post(
    "/imports/day-one",
    response_model=DayOneImportResult,
    status_code=status.HTTP_201_CREATED,
    tags=["imports"],
    summary="Import a Day One journal JSON export",
)
async def import_day_one(
    payload: DayOneImportPayload,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DayOneImportResult:
    """Parse + persist a Day One export.

    Imported entries default to `visibility=personal` and
    `type=note`. The importer never inspects location coordinates
    — a location's human name is captured in the entry body when
    present, but latitude/longitude are dropped. The operator can
    later attach precise coordinates via the pilgrimage-site flow.
    """
    summary = parse_day_one_export(payload.model_dump())
    if summary.total_entries == 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No entries found in payload — is this a Day One JSON export?",
        )

    entry_ids: list[str] = []
    for imported in summary.entries:
        # Preserve source metadata in the body so a future re-export
        # or audit can reconstruct the import trail.
        body_lines = [imported.body]
        footer = ["\n\n---"]
        if imported.tags:
            footer.append(f"Tags: {', '.join(imported.tags)}")
        if imported.starred:
            footer.append("Starred in Day One.")
        if imported.location_summary:
            footer.append(f"Location: {imported.location_summary}")
        if imported.source_uuid:
            footer.append(f"Day One UUID: {imported.source_uuid}")
        body = "\n".join(body_lines + [line for line in footer if line])

        row = Entry(
            title=imported.title,
            type=EntryType.NOTE,
            excerpt=imported.title[:1024],
            body=body,
            body_text=body,
            glyph="feather",
            visibility=EntryVisibility.PERSONAL,
            occurred_at=imported.created_at,
            owner_id=current_user.id,
        )
        db.add(row)
        await db.flush()
        entry_ids.append(str(row.id))

    await db.commit()

    return DayOneImportResult(
        total_entries=summary.total_entries,
        imported=summary.imported,
        skipped=summary.skipped,
        skipped_reasons=summary.skipped_reasons,
        entry_ids=entry_ids,
    )
