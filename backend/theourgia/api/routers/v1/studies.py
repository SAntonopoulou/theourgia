"""Study HTTP endpoints (B112).

Per ``plan/08-batches-backend.md`` § B112.

``GET    /api/v1/studies``                         — list
``GET    /api/v1/studies/{id}``                    — read
``POST   /api/v1/studies``                         — create
``PATCH  /api/v1/studies/{id}``                    — update (not query)
``DELETE /api/v1/studies/{id}``                    — soft delete
``POST   /api/v1/studies/{id}/run``                — execute + snapshot
``GET    /api/v1/studies/{id}/snapshots``          — list snapshots
``GET    /api/v1/studies/{id}/snapshots/{snap}``   — read snapshot
``PATCH  /api/v1/studies/{id}/snapshots/{snap}``   — annotate notes only

Honesty rules:
  * ``query`` is immutable after first save. PATCH/Update cannot
    change it — the schema doesn't even accept it.
  * Snapshots are frozen: ``results`` is read-only; only ``notes``
    is editable.
  * Every ``/run`` creates a new snapshot row, never replaces.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.studies import (
    Study,
    StudyKind,
    StudySnapshot,
    StudyVisibility,
)

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class StudyRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    kind: str
    query: dict
    description: str | None
    visibility: str
    created_at: datetime
    updated_at: datetime


class StudyCreate(BaseModel):
    """Create a new study. ``query`` is captured here and never
    changes."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    kind: StudyKind
    query: dict = Field(default_factory=dict)
    description: str | None = None
    visibility: StudyVisibility = StudyVisibility.PERSONAL


class StudyUpdate(BaseModel):
    """Patch a study. ``query`` is INTENTIONALLY ABSENT — it is
    immutable after first save (H06 §8 ritual rule)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    visibility: StudyVisibility | None = None


class StudySnapshotRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    study_id: str
    results: dict
    notes: str | None
    created_at: datetime
    updated_at: datetime


class StudySnapshotUpdate(BaseModel):
    """Annotate a snapshot. Only ``notes`` is editable."""

    model_config = ConfigDict(extra="forbid")

    notes: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────


def _to_study_read(row: Study) -> StudyRead:
    return StudyRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        kind=row.kind.value,
        query=dict(row.query or {}),
        description=row.description,
        visibility=row.visibility.value,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_snapshot_read(row: StudySnapshot) -> StudySnapshotRead:
    return StudySnapshotRead(
        id=str(row.id),
        study_id=str(row.study_id),
        results=dict(row.results or {}),
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _owner_check(row: Study, current_user_id: UUID) -> None:
    if row.owner_id != current_user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/studies", response_model=list[StudyRead], tags=["studies"],
)
async def list_studies(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    kind: StudyKind | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[StudyRead]:
    stmt = select(Study).where(
        Study.deleted_at.is_(None),
        Study.owner_id == current_user.id,
    )
    if kind is not None:
        stmt = stmt.where(Study.kind == kind)
    stmt = (
        stmt.order_by(Study.created_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_study_read(r) for r in rows]


@router.post(
    "/studies",
    response_model=StudyRead,
    status_code=status.HTTP_201_CREATED,
    tags=["studies"],
)
async def create_study(
    payload: StudyCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudyRead:
    owner_id = current_user.id
    row = Study(
        owner_id=owner_id,
        name=payload.name,
        kind=payload.kind,
        query=dict(payload.query),
        description=payload.description,
        visibility=payload.visibility,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_study_read(row)


@router.get(
    "/studies/{study_id}", response_model=StudyRead, tags=["studies"],
)
async def get_study(
    study_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudyRead:
    row = await db.get(Study, study_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(row, current_user.id)
    return _to_study_read(row)


@router.patch(
    "/studies/{study_id}", response_model=StudyRead, tags=["studies"],
)
async def update_study(
    study_id: UUID,
    payload: StudyUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudyRead:
    row = await db.get(Study, study_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(row, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_study_read(row)


@router.delete(
    "/studies/{study_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["studies"],
)
async def delete_study(
    study_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Study, study_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(row, current_user.id)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/studies/{study_id}/run",
    response_model=StudySnapshotRead,
    status_code=status.HTTP_201_CREATED,
    tags=["studies"],
)
async def run_study(
    study_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudySnapshotRead:
    """Execute the study's query and record a frozen snapshot.

    The actual query execution is dispatched by ``kind``. For
    ``gematria_search`` the snapshot records the response shape
    that ``/gematria/search`` produces; for ``gematria_calculation``
    it records the per-cipher breakdown. Execution is performed
    HERE (server-side) so the snapshot reflects the state of the
    practitioner's vault at run-time.
    """
    row = await db.get(Study, study_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(row, current_user.id)

    if row.kind == StudyKind.GEMATRIA_SEARCH:
        # Re-build the search payload from the stored query + run.
        from theourgia.api.routers.v1.gematria_search import (
            GematriaSearchPayload,
            search_gematria,
        )

        try:
            payload = GematriaSearchPayload(**(row.query or {}))
        except Exception as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Stored query is invalid: {exc}",
            )
        response = await search_gematria(payload, db, current_user)
        results = response.model_dump()
    elif row.kind == StudyKind.QUERY_BUILDER:
        # B122 wired: parse + execute against the caller's vault.
        # The snapshot's results mirror the QueryExecutionResult
        # shape — the same one the live /analytics/query endpoint
        # returns.
        from theourgia.core.analytics.executor import (
            ExecutionError,
            execute_query,
        )
        from theourgia.core.analytics.query_dsl import (
            DSLValidationError,
            parse as parse_query,
        )

        try:
            parsed = parse_query(dict(row.query or {}))
        except DSLValidationError as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Stored query is invalid: {exc}",
            )
        try:
            exec_result = await execute_query(
                db=db, owner_id=current_user.id, parsed=parsed,
            )
        except (DSLValidationError, ExecutionError) as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                str(exc),
            )
        results = exec_result.model_dump()
    elif row.kind == StudyKind.GEMATRIA_CALCULATION:
        # Stored as { input: str, cipher_ids: [uuid, ...] }. We
        # execute against the per-vault ciphers and produce a
        # per-cipher value list.
        from theourgia.core.linguistic.indexer import (
            compute_gematria,
            normalise_text,
            reduce_to_digit,
        )
        from theourgia.models.ciphers import Cipher

        q = row.query or {}
        text = str(q.get("input") or "")
        cipher_ids = [UUID(c) for c in (q.get("cipher_ids") or [])]
        if not text or not cipher_ids:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Calculation study requires input + cipher_ids.",
            )
        stmt = (
            select(Cipher)
            .where(Cipher.id.in_(cipher_ids))
            .where(Cipher.deleted_at.is_(None))
        )
        ciphers = (await db.execute(stmt)).scalars().all()
        normalised = normalise_text(text)
        per_cipher = []
        for c in ciphers:
            value = compute_gematria(normalised, dict(c.mapping or {}))
            per_cipher.append({
                "cipher_id": str(c.id),
                "cipher_name": c.name,
                "value": value,
                "digit_sum": reduce_to_digit(value),
            })
        results = {
            "input": text,
            "normalised": normalised,
            "per_cipher": per_cipher,
        }
    else:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown study kind: {row.kind!r}",
        )

    snap = StudySnapshot(
        study_id=row.id,
        results=results,
        notes=None,
    )
    db.add(snap)
    await db.commit()
    await db.refresh(snap)
    return _to_snapshot_read(snap)


@router.get(
    "/studies/{study_id}/snapshots",
    response_model=list[StudySnapshotRead],
    tags=["studies"],
)
async def list_snapshots(
    study_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[StudySnapshotRead]:
    study = await db.get(Study, study_id)
    if study is None or study.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(study, current_user.id)
    stmt = (
        select(StudySnapshot)
        .where(StudySnapshot.study_id == study_id)
        .order_by(StudySnapshot.created_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_snapshot_read(r) for r in rows]


@router.get(
    "/studies/{study_id}/snapshots/{snapshot_id}",
    response_model=StudySnapshotRead,
    tags=["studies"],
)
async def get_snapshot(
    study_id: UUID,
    snapshot_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudySnapshotRead:
    study = await db.get(Study, study_id)
    if study is None or study.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(study, current_user.id)
    snap = await db.get(StudySnapshot, snapshot_id)
    if snap is None or snap.study_id != study_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Snapshot not found."
        )
    return _to_snapshot_read(snap)


@router.patch(
    "/studies/{study_id}/snapshots/{snapshot_id}",
    response_model=StudySnapshotRead,
    tags=["studies"],
)
async def annotate_snapshot(
    study_id: UUID,
    snapshot_id: UUID,
    payload: StudySnapshotUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> StudySnapshotRead:
    """Edit a snapshot's notes. ``results`` is frozen — only
    ``notes`` is editable here (the schema enforces this)."""
    study = await db.get(Study, study_id)
    if study is None or study.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study not found.")
    _owner_check(study, current_user.id)
    snap = await db.get(StudySnapshot, snapshot_id)
    if snap is None or snap.study_id != study_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Snapshot not found."
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(snap, k, v)
    await db.commit()
    await db.refresh(snap)
    return _to_snapshot_read(snap)
