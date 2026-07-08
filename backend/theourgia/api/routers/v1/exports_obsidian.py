"""Obsidian export endpoint — b108-2hh part 2.

FEATURES §13 · reference plugin (Obsidian markdown exporter).

Streams a ZIP containing one .md file per Entry the caller owns,
formatted with YAML frontmatter + Tiptap-rendered markdown body.

Sealed entries are excluded — the SQL WHERE clause filters them
before the export loop even sees the row.
"""

from __future__ import annotations

import io
import zipfile
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.exports.obsidian import (
    ObsidianExportEntry,
    render_entry_markdown,
    safe_filename,
)
from theourgia.models.entries import EncryptionMode, Entry

__all__ = ["router"]

router = APIRouter()


@router.get(
    "/exports/obsidian",
    tags=["exports"],
    responses={
        200: {
            "content": {"application/zip": {}},
            "description": "ZIP archive of markdown files",
        },
    },
    summary="Export all entries as an Obsidian-compatible ZIP",
)
async def export_obsidian(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Stream a ZIP of Obsidian markdown files.

    Filters:
    - only entries owned by the caller
    - only non-deleted entries
    - **NEVER** sealed / encrypted entries (defence in depth
      against accidental disclosure through a bulk export)
    """
    stmt = (
        select(Entry)
        .where(
            Entry.owner_id == current_user.id,
            Entry.deleted_at.is_(None),
            Entry.encryption_mode == EncryptionMode.NONE,
        )
        .order_by(Entry.created_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        # A small README so the vault import isn't mysterious.
        archive.writestr(
            "README.md",
            _README.format(
                count=len(rows),
                exported_at=datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            ),
        )
        seen_names: dict[str, int] = {}
        for row in rows:
            entry = ObsidianExportEntry(
                id=str(row.id),
                title=row.title,
                entry_type=row.type.value,
                excerpt=row.excerpt or "",
                body_text=row.body_text,
                body_json=row.body,
                glyph=row.glyph,
                visibility=row.visibility.value,
                created_at=row.created_at.isoformat(),
                updated_at=row.updated_at.isoformat(),
                occurred_at=row.occurred_at.isoformat() if row.occurred_at else None,
                sealed=False,
            )
            filename = safe_filename(entry)
            # Disambiguate duplicate titles with a numeric suffix.
            base, dot, ext = filename.rpartition(".")
            counter = seen_names.get(base, 0)
            if counter > 0:
                filename = f"{base} ({counter}).{ext}"
            seen_names[base] = counter + 1

            archive.writestr(filename, render_entry_markdown(entry))

    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": (
                'attachment; filename="theourgia-obsidian-export.zip"'
            ),
            "Cache-Control": "private, no-store",
            "X-Export-Format": "obsidian",
            "X-Sealed-Excluded": "1",
        },
    )


_README = """# Theourgia Obsidian Export

Exported: {exported_at}
Entries: {count}

## What's here

One markdown file per journal entry, ready to drop into an Obsidian
vault. Every file has YAML frontmatter with the entry's title,
type, timestamps, glyph, and visibility. The body is rendered from
Tiptap JSON with fallbacks for older plain-text rows.

## What's NOT here

Sealed / encrypted entries are excluded. This is by design — the
export runs on the plaintext side of the vault, and pushing sealed
content through a bulk export would defeat the whole point of the
seal.

If you need to move sealed content between vaults, use the
Theourgia native export instead, which handles the encryption
envelope end-to-end.
"""
