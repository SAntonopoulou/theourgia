"""Seal-consistency tests — v1-033.

Covers the batch's four backend deliverables:

1. **Entry seal round-trip** (the honest Mode B model): POST
   ``/entries/{id}/seal`` stores the client-encrypted envelope,
   NULLs ``body`` / ``body_text``, and purges plaintext revisions in
   the same transaction. One-way — already-sealed 409s, public
   entries refuse, and there is NO unseal endpoint.
2. **Sealed-payload reads** for entries, oaths, and initiations:
   base64 ciphertext for the owner only; non-sealed rows 409; the
   response models cannot leak plaintext by construction.
3. **Sealed PATCH refusals**: the general entry PATCH refuses
   plaintext bodies and public visibility on sealed rows; the
   ``sealed`` field itself is still rejected (sealing routes through
   the dedicated endpoint, never a boolean flip).
4. **Bundle uninstall**: removes the install record and NOTHING else
   (MBF tombstone-not-erasure) — owner-gated, audited, explicit in
   the response.

Uses the fake-session pattern from the memorial + revision tests.
The 401-without-credentials coverage lives in
``test_auth_required_endpoints.py``.
"""

from __future__ import annotations

import json
from base64 import b64decode, b64encode
from datetime import UTC, datetime
from inspect import getsource
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1 import (
    bundles as bundles_module,
    entries as entries_module,
    initiations as initiations_module,
    oaths as oaths_module,
)
from theourgia.api.routers.v1.bundles import uninstall_bundle
from theourgia.api.routers.v1.entries import (
    EntrySealedPayloadRead,
    EntrySealRequest,
    EntryUpdate,
    get_entry_sealed_payload,
    seal_entry,
    update_entry,
)
from theourgia.api.routers.v1.initiations import (
    InitiationSealedPayloadRead,
    get_initiation_sealed_payload,
)
from theourgia.api.routers.v1.oaths import (
    OathSealedPayloadRead,
    get_oath_sealed_payload,
)
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryType,
    EntryVisibility,
)
from theourgia.models.initiations import Initiation
from theourgia.models.oaths import Oath, OathKind

# The client-side envelope format (vaultCrypto's sealToEnvelope):
# a JSON wrapper carrying the IV next to the salt-embedded ciphertext.
ENVELOPE = json.dumps({"v": 1, "iv": "aXYtYnl0ZXM=", "ct": "c2FsdCtjaXBoZXJ0ZXh0"})


# ── Fakes ────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, scalar=None, rowcount=0) -> None:
        self._scalar = scalar
        self.rowcount = rowcount

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return self

    def first(self):
        return self._scalar


class FakeSession:
    """Serves the entry / installed-bundle select; records revision
    purges, deletes, adds, and commits."""

    def __init__(self, *, row=None, delete_rowcount=0) -> None:
        self.row = row
        self.delete_rowcount = delete_rowcount
        self.executed: list[str] = []
        self.revision_deletes: list[str] = []
        self.added: list[object] = []
        self.deleted: list[object] = []
        self.commits = 0

    async def execute(self, stmt):
        sql = str(stmt)
        self.executed.append(sql)
        if sql.startswith("DELETE") and "entry_revision" in sql:
            self.revision_deletes.append(sql)
            return FakeResult(rowcount=self.delete_rowcount)
        return FakeResult(scalar=self.row)

    async def get(self, _model, _pk):
        return self.row

    def add(self, obj) -> None:
        self.added.append(obj)

    async def delete(self, obj) -> None:
        self.deleted.append(obj)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, obj) -> None:
        return None


def make_entry(**overrides) -> Entry:
    defaults: dict[str, object] = {
        "title": "Candle held its flame",
        "type": EntryType.NOTE,
        "excerpt": "",
        "glyph": "feather",
        "body": '{"type":"doc","content":[]}',
        "body_text": "Candle held its flame",
        "owner_id": uuid4(),
        "visibility": EntryVisibility.PERSONAL,
        "encryption_mode": EncryptionMode.NONE,
    }
    defaults.update(overrides)
    return Entry(**defaults)


def user_for(row) -> SimpleNamespace:
    return SimpleNamespace(id=row.owner_id)


# ── Entry seal round-trip ────────────────────────────────────────


@pytest.mark.asyncio
async def test_seal_entry_round_trip_stores_ciphertext_and_purges() -> None:
    """The one honest seal transition: envelope stored as bytes,
    plaintext NULLed, plaintext revisions purged, one commit."""
    entry = make_entry()
    session = FakeSession(row=entry, delete_rowcount=3)
    read = await seal_entry(
        entry.id, EntrySealRequest(encrypted_payload=ENVELOPE),
        session, user_for(entry),
    )
    assert entry.encryption_mode == EncryptionMode.SEALED
    assert entry.encrypted_payload == ENVELOPE.encode("utf-8")
    assert entry.body is None
    assert entry.body_text is None
    # Revisions purged in the SAME transaction (before the commit).
    assert len(session.revision_deletes) == 1
    assert session.commits == 1
    # The wire read reports sealed and carries no plaintext body.
    assert read.sealed is True
    assert read.encryption_mode == "sealed"
    assert read.body is None


@pytest.mark.asyncio
async def test_seal_entry_refuses_already_sealed() -> None:
    entry = make_entry(
        encryption_mode=EncryptionMode.SEALED, body=None, body_text=None
    )
    session = FakeSession(row=entry)
    with pytest.raises(HTTPException) as exc:
        await seal_entry(
            entry.id, EntrySealRequest(encrypted_payload=ENVELOPE),
            session, user_for(entry),
        )
    assert exc.value.status_code == 409
    assert session.commits == 0


@pytest.mark.asyncio
async def test_seal_entry_refuses_public_entries() -> None:
    """Sealed content is never publicly visible — sealing a PUBLIC
    entry must refuse rather than silently produce a public row whose
    body is ciphertext."""
    entry = make_entry(visibility=EntryVisibility.PUBLIC)
    session = FakeSession(row=entry)
    with pytest.raises(HTTPException) as exc:
        await seal_entry(
            entry.id, EntrySealRequest(encrypted_payload=ENVELOPE),
            session, user_for(entry),
        )
    assert exc.value.status_code == 403
    assert entry.encryption_mode == EncryptionMode.NONE
    assert session.commits == 0


@pytest.mark.asyncio
async def test_seal_entry_404_when_not_owned() -> None:
    """The select filters on owner_id — a foreign row surfaces as
    absent, exactly like every other entry endpoint."""
    session = FakeSession(row=None)
    with pytest.raises(HTTPException) as exc:
        await seal_entry(
            uuid4(), EntrySealRequest(encrypted_payload=ENVELOPE),
            session, SimpleNamespace(id=uuid4()),
        )
    assert exc.value.status_code == 404


def test_seal_endpoints_registered_and_no_unseal_exists() -> None:
    """One-way model: /seal and /sealed-payload exist; nothing named
    unseal does — the server cannot unseal what it cannot read."""
    paths_methods = {
        (r.path, m)
        for r in entries_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/entries/{entry_id}/seal", "POST") in paths_methods
    assert ("/entries/{entry_id}/sealed-payload", "GET") in paths_methods
    assert not any("unseal" in path for path, _ in paths_methods)


def test_seal_paths_filter_on_owner_source_guard() -> None:
    for endpoint in (seal_entry, get_entry_sealed_payload):
        assert "Entry.owner_id == current_user.id" in getsource(endpoint)


# ── Entry sealed-payload read ────────────────────────────────────


@pytest.mark.asyncio
async def test_entry_sealed_payload_round_trips_base64() -> None:
    entry = make_entry(
        encryption_mode=EncryptionMode.SEALED,
        body=None,
        body_text=None,
        encrypted_payload=ENVELOPE.encode("utf-8"),
    )
    session = FakeSession(row=entry)
    read = await get_entry_sealed_payload(entry.id, session, user_for(entry))
    assert b64decode(read.encrypted_payload_b64) == ENVELOPE.encode("utf-8")


@pytest.mark.asyncio
async def test_entry_sealed_payload_409_when_not_sealed() -> None:
    entry = make_entry()
    session = FakeSession(row=entry)
    with pytest.raises(HTTPException) as exc:
        await get_entry_sealed_payload(entry.id, session, user_for(entry))
    assert exc.value.status_code == 409


def test_sealed_payload_models_cannot_leak_plaintext() -> None:
    """Ciphertext-only by construction — a plaintext field cannot be
    serialized because none exists on any of the three read models."""
    for model in (
        EntrySealedPayloadRead,
        OathSealedPayloadRead,
        InitiationSealedPayloadRead,
    ):
        assert set(model.model_fields) == {"encrypted_payload_b64"}


# ── Sealed PATCH refusals ────────────────────────────────────────


def test_entry_update_still_rejects_a_sealed_field() -> None:
    """Sealing is a dedicated transition (POST /entries/{id}/seal),
    never a boolean PATCH — {"sealed": true} keeps 422ing by design.
    The Editor routes through the seal endpoint as of v1-033."""
    with pytest.raises(ValidationError):
        EntryUpdate(sealed=True)


@pytest.mark.asyncio
async def test_entry_update_refuses_plaintext_body_on_sealed_rows() -> None:
    entry = make_entry(
        encryption_mode=EncryptionMode.SEALED, body=None, body_text=None
    )
    session = FakeSession(row=entry)
    with pytest.raises(HTTPException) as exc:
        await update_entry(
            entry.id, EntryUpdate(body="plaintext"), session, user_for(entry)
        )
    assert exc.value.status_code == 403
    assert entry.body is None


@pytest.mark.asyncio
async def test_entry_update_refuses_public_visibility_on_sealed_rows() -> None:
    entry = make_entry(
        encryption_mode=EncryptionMode.SEALED, body=None, body_text=None
    )
    session = FakeSession(row=entry)
    with pytest.raises(HTTPException) as exc:
        await update_entry(
            entry.id, EntryUpdate(visibility="public"), session, user_for(entry)
        )
    assert exc.value.status_code == 403
    assert entry.visibility == EntryVisibility.PERSONAL


# ── Oath / initiation sealed-payload reads ───────────────────────


def make_oath(**overrides) -> Oath:
    defaults: dict[str, object] = {
        "kind": OathKind.SELF,
        "taken_at": datetime(2026, 1, 1, tzinfo=UTC),
        "owner_id": uuid4(),
        "encryption_mode": EncryptionMode.SEALED,
        "encrypted_payload": ENVELOPE.encode("utf-8"),
    }
    defaults.update(overrides)
    return Oath(**defaults)


def make_initiation(**overrides) -> Initiation:
    defaults: dict[str, object] = {
        "tradition": "Hellenic mystery",
        "owner_id": uuid4(),
        "encryption_mode": EncryptionMode.SEALED,
        "encrypted_payload": ENVELOPE.encode("utf-8"),
    }
    defaults.update(overrides)
    return Initiation(**defaults)


@pytest.mark.asyncio
async def test_oath_sealed_payload_owner_reads_ciphertext() -> None:
    row = make_oath()
    read = await get_oath_sealed_payload(
        row.id, FakeSession(row=row), user_for(row)
    )
    assert read.encrypted_payload_b64 == b64encode(
        ENVELOPE.encode("utf-8")
    ).decode("ascii")


@pytest.mark.asyncio
async def test_oath_sealed_payload_cross_user_404s() -> None:
    row = make_oath()
    with pytest.raises(HTTPException) as exc:
        await get_oath_sealed_payload(
            row.id, FakeSession(row=row), SimpleNamespace(id=uuid4())
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_oath_sealed_payload_409_when_not_sealed() -> None:
    row = make_oath(
        encryption_mode=EncryptionMode.NONE,
        encrypted_payload=None,
        text="A public vow.",
    )
    with pytest.raises(HTTPException) as exc:
        await get_oath_sealed_payload(row.id, FakeSession(row=row), user_for(row))
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_initiation_sealed_payload_owner_reads_ciphertext() -> None:
    row = make_initiation()
    read = await get_initiation_sealed_payload(
        row.id, FakeSession(row=row), user_for(row)
    )
    assert b64decode(read.encrypted_payload_b64) == ENVELOPE.encode("utf-8")


@pytest.mark.asyncio
async def test_initiation_sealed_payload_cross_user_404s() -> None:
    row = make_initiation()
    with pytest.raises(HTTPException) as exc:
        await get_initiation_sealed_payload(
            row.id, FakeSession(row=row), SimpleNamespace(id=uuid4())
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_initiation_sealed_payload_409_when_no_ciphertext() -> None:
    row = make_initiation(encrypted_payload=None)
    with pytest.raises(HTTPException) as exc:
        await get_initiation_sealed_payload(
            row.id, FakeSession(row=row), user_for(row)
        )
    assert exc.value.status_code == 409


def test_sealed_payload_routes_registered() -> None:
    oath_paths = {
        (r.path, m)
        for r in oaths_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    init_paths = {
        (r.path, m)
        for r in initiations_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/oaths/{oath_id}/sealed-payload", "GET") in oath_paths
    assert ("/initiations/{init_id}/sealed-payload", "GET") in init_paths


# ── Bundle uninstall (tombstone, not erasure) ────────────────────


def make_installed(**overrides) -> InstalledBundle:
    defaults: dict[str, object] = {
        "owner_id": uuid4(),
        "slug": "hellenic-pantheon",
        "version": "1.0.0",
        "name": "Hellenic Pantheon",
        "type": "pantheon",
        "manifest": {},
        "signature_verdict": "unsigned",
        "imported_item_count": 13,
        "attribution": "Hellenic Pantheon v1.0.0 by Theourgia Project — CC0-1.0",
    }
    defaults.update(overrides)
    return InstalledBundle(**defaults)


@pytest.mark.asyncio
async def test_uninstall_removes_record_but_not_imported_content() -> None:
    row = make_installed()
    session = FakeSession(row=row)
    response = await uninstall_bundle(user_for(row), session, row.id)
    # The install record is the ONLY delete; no statement touches
    # entity / template / recipe tables.
    assert session.deleted == [row]
    assert session.revision_deletes == []
    assert all("DELETE" not in sql for sql in session.executed)
    assert session.commits == 1
    # The response documents the retention rule explicitly.
    assert response.removed_id == str(row.id)
    assert response.imported_content_retained is True
    assert "tombstone, not an erasure" in response.detail
    # The uninstall is audited.
    audit_rows = [
        obj for obj in session.added if getattr(obj, "action", "") == "bundle.uninstall"
    ]
    assert len(audit_rows) == 1


@pytest.mark.asyncio
async def test_uninstall_404_when_not_owned() -> None:
    session = FakeSession(row=None)
    with pytest.raises(HTTPException) as exc:
        await uninstall_bundle(SimpleNamespace(id=uuid4()), session, uuid4())
    assert exc.value.status_code == 404
    assert session.deleted == []


def test_uninstall_filters_on_owner_source_guard() -> None:
    assert "InstalledBundle.owner_id == user.id" in getsource(uninstall_bundle)


def test_uninstall_route_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in bundles_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/bundles/installed/{installed_id}", "DELETE") in paths_methods
