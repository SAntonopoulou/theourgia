# GDPR substrate — developer guide

Every feature that stores user data plugs into this substrate. The central data-export and account-deletion endpoints iterate the registries; feature owners never write per-feature export endpoints.

## The substrate at a glance

```
core/gdpr/
├── export.py          # ExportRegistry, ExportContext, Exporter
├── deletion.py        # DeletionRegistry, DeletionContext, DeletionHandler, DeletionReport
├── consent.py         # ConsentPurpose, ConsentSet, ConsentResolver
└── service.py         # GDPRService (orchestrator + coverage audit)
```

## Pattern: a feature registers itself

A feature that stores user data has TWO obligations:

```python
# theourgia/features/journal/gdpr.py
from theourgia.core.gdpr import (
    DeletionContext,
    DeletionReport,
    ExportContext,
    register_deletion_handler,
    register_exporter,
)


async def export_journal(ctx: ExportContext) -> dict[str, object]:
    # Query everything belonging to ctx.user_id from this feature's
    # tables. Return a JSON-serializable dict.
    return {
        "entries": [...],
        "tags": [...],
    }


async def delete_journal(ctx: DeletionContext) -> DeletionReport:
    # Remove or anonymize this feature's data for ctx.user_id.
    # Use ctx.db_session if present (transactional with the caller).
    deleted = await ctx.db_session.execute(...)  # actual deletion
    return DeletionReport(
        feature="journal",
        rows_deleted=deleted.rowcount,
    )


def register() -> None:
    register_exporter(
        "journal",
        export_journal,
        description="Journal entries, tags, and entry timestamps.",
    )
    register_deletion_handler(
        "journal",
        delete_journal,
        description="Deletes all entries and tags created by the user.",
    )
```

Both registrations happen at module import. The audit pass verifies that **every feature with a user_id column** is represented in both registries.

## Delete vs anonymize

Two valid strategies inside a deletion handler:

- **Delete** the row entirely. Use for content the user wholly owns (entries, sigils, divination logs, uploads).
- **Anonymize** identifying fields, keep the row. Use for content that's been federated / published to shared spaces — peer instances may still reference the row, and wholesale deletion would orphan their links. Set `owner_id = NULL`, redact identifying text, but keep the row.

The `DeletionReport` distinguishes via `rows_deleted` and `rows_anonymized` so the operator can see what happened.

## Pattern: consulting consent before optional processing

Features that engage in **optional** processing — federation publication, AI agent invocation, hub newsletter inclusion, external search indexing — must check consent first:

```python
from theourgia.core.gdpr import ConsentPurpose

if not (await consent_resolver.get(user_id)).is_granted(
    ConsentPurpose.FEDERATION_PUBLISH
):
    # User has not consented to federation; skip outbound publish.
    return

# Otherwise: proceed
```

Required processing (account operation, security, legal compliance) doesn't ride this substrate. It happens regardless of consent state because it's not optional.

## Pattern: testing

```python
@pytest.mark.asyncio
async def test_my_feature_export():
    exp = ExportRegistry()
    register_exporter("my_feature", my_exporter, registry=exp)
    service = GDPRService(export_registry=exp)
    archive = await service.export_user_data(user_id=user.id)
    assert archive["features"]["my_feature"] == expected_shape
```

Always use an isolated `ExportRegistry` / `DeletionRegistry` per test so the global default doesn't bleed in.

## Failure semantics

- **Export:** one failing exporter does NOT short-circuit the whole archive. The feature's slot becomes `None` and its name appears in `missing_features`. The user sees what couldn't be retrieved.
- **Deletion:** one failing handler does NOT short-circuit subsequent handlers. The synthetic report records the error. The operator re-runs deletion for the failed feature individually.

Neither path silently swallows errors — every failure logs at WARNING.

## Coverage audit

`GDPRService.coverage_audit()` returns three lists:

- `export_only` — features registered for export but missing a deletion handler. **Almost always a bug.**
- `deletion_only` — features registered for deletion but missing export. Sometimes intentional (security-sensitive shadow data that's hidden from the user but still deletable).
- `both` — properly registered features.

The foundation audit pass between substrate sweeps and Phase 02 calls this and verifies no `export_only` entries exist.

## What the central endpoints will look like

Sketch — these endpoints land alongside the Phase 02 account UI:

```python
@router.get("/api/v1/me/data-export")
async def export_my_data(
    user: CurrentUser,
    session: DBSession,
    gdpr_service: GDPRServiceDep,
) -> JSONResponse:
    archive = await gdpr_service.export_user_data(
        user_id=user.id, db_session=session
    )
    return JSONResponse(archive)


@router.delete("/api/v1/me/account")
async def delete_my_account(
    user: CurrentUser,
    session: DBSession,
    gdpr_service: GDPRServiceDep,
):
    reports = await gdpr_service.delete_user_data(
        user_id=user.id, db_session=session
    )
    await session.commit()
    return {"deleted": [r.feature for r in reports]}
```

The substrate is in place today; the endpoints are wiring.

## Why this isn't optional

Sophia: "GDPR compliance from architecture, not retrofitted." Every feature that stores user data must hook in or the foundation audit fails. There is no "I'll add the exporter later" — `later` is when a regulator or a deleting user is waiting on the response.
