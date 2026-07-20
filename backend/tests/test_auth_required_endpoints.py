"""Auth-required smoke tests for v1 routers.

CRITICAL SECURITY REGRESSION GUARD: this file exercises write endpoints
(and the reads-of-owned-data endpoints) that require authentication.
The suite asserts each returns 401 without credentials.

Before this batch, endpoints under `/api/v1/*` accepted anonymous writes
(the entries router took a nullable owner via `OptionalCookieUser`).
This test file enforces the new invariant so future regressions surface
immediately.

The tests are intentionally parametrized against a single endpoint per
router — the exhaustive per-endpoint coverage lives in each router's
dedicated test file. If we ever add a new router, add a line to
``AUTH_REQUIRED_ENDPOINTS`` below.
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

# ``(METHOD, PATH, JSON_BODY_OR_NONE)`` triples. One canonical endpoint
# per router — chosen to be either the primary write (POST) or a
# reads-of-owned-data endpoint that MUST require auth.
AUTH_REQUIRED_ENDPOINTS: list[tuple[str, str, dict | None]] = [
    # Entries — the vulnerability we're fixing.
    ("POST", "/api/v1/entries", {"title": "unauth", "type": "note"}),
    ("GET", "/api/v1/entries", None),
    ("GET", "/api/v1/entries/stats", None),
    # Entry version history (v1-028). Doubly important: revisions hold
    # prior plaintext of private entries.
    (
        "GET",
        "/api/v1/entries/00000000-0000-0000-0000-000000000000/revisions",
        None,
    ),
    (
        "POST",
        "/api/v1/entries/00000000-0000-0000-0000-000000000000/revisions/"
        "00000000-0000-0000-0000-000000000001/restore",
        None,
    ),
    # Entry seal (v1-033). Doubly important: the sealed-payload read
    # hands out vault ciphertext.
    (
        "POST",
        "/api/v1/entries/00000000-0000-0000-0000-000000000000/seal",
        {"encrypted_payload": "{}"},
    ),
    (
        "GET",
        "/api/v1/entries/00000000-0000-0000-0000-000000000000/sealed-payload",
        None,
    ),
    # Traditions (v1-001).
    ("GET", "/api/v1/traditions/closed-slugs", None),
    # Entities + alias-graph + views.
    ("POST", "/api/v1/entities", {"name": "x"}),
    ("GET", "/api/v1/entities", None),
    ("POST", "/api/v1/entity-aliases", {
        "source_entity_id": "00000000-0000-0000-0000-000000000001",
        "target_entity_id": "00000000-0000-0000-0000-000000000002",
        "kind": "same-as",
    }),
    ("GET", "/api/v1/entity-views", None),
    # Divination — horary, iching, tarot, geomancy, runes, pendulum,
    # bibliomancy, scrying.
    ("POST", "/api/v1/horary/cast", {
        "question": "?", "latitude": 0.0, "longitude": 0.0,
    }),
    ("POST", "/api/v1/iching/cast", {}),
    ("POST", "/api/v1/tarot/cast", {
        "deck_id": "00000000-0000-0000-0000-000000000001",
        "spread_id": "00000000-0000-0000-0000-000000000002",
    }),
    ("GET", "/api/v1/geomancy/readings", None),
    ("GET", "/api/v1/runes/readings", None),
    ("POST", "/api/v1/pendulum/readings", {
        "question": "?", "outcome": "yes",
    }),
    ("POST", "/api/v1/bibliomancy/cast", {
        "book_id": "00000000-0000-0000-0000-000000000001",
        "question": "?",
    }),
    ("POST", "/api/v1/scrying/sessions", {"mode": "water_bowl"}),
    # Workshop — sigils, magic squares, talismans, voces, circles, tools,
    # altars.
    ("POST", "/api/v1/sigils", {
        "title": "s", "intention": "i", "mode": "spare", "svg": "<svg/>",
    }),
    ("POST", "/api/v1/magic-squares", {
        "name": "x", "order": 3, "cells": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
    }),
    ("POST", "/api/v1/talismans", {
        "name": "t", "purpose": "p", "front_svg": "<svg/>", "back_svg": "<svg/>",
    }),
    ("POST", "/api/v1/voces", {
        "name": "v", "source_text": "hi", "source_script": "latin",
        "source_citation": "PD ed.",
    }),
    ("POST", "/api/v1/circles", {
        "name": "c", "purpose": "p",
        "rings": [{"kind": "blank"}],
        "compass_tradition": "hermetic",
        "compass_points": {},
        "centre_element": {"kind": "blank"},
    }),
    ("POST", "/api/v1/tools", {"name": "t", "kind": "wand"}),
    ("POST", "/api/v1/altars", {"name": "a"}),
    # Journaling substrate.
    ("POST", "/api/v1/books", {"title": "b"}),
    ("POST", "/api/v1/templates", {
        "name": "t", "kind": "note", "body_template": "x",
    }),
    ("POST", "/api/v1/oaths", {
        "kind": "self",
        "taken_at": "2026-01-01T00:00:00Z",
        "encryption_mode": "sealed",
        "encrypted_payload": "AAAA",
    }),
    # Sealed-payload reads (v1-033) — vault ciphertext, owner-only.
    (
        "GET",
        "/api/v1/oaths/00000000-0000-0000-0000-000000000000/sealed-payload",
        None,
    ),
    (
        "GET",
        "/api/v1/initiations/00000000-0000-0000-0000-000000000000/"
        "sealed-payload",
        None,
    ),
    ("POST", "/api/v1/contracts", {
        "entity_id": "00000000-0000-0000-0000-000000000001",
        "title": "t",
    }),
    ("POST", "/api/v1/offerings", {
        "entity_id": "00000000-0000-0000-0000-000000000001",
        "offered_at": "2026-01-01T00:00:00Z",
    }),
    ("POST", "/api/v1/servitors", {"name": "s"}),
    ("POST", "/api/v1/initiations", {
        "tradition": "t", "status": "sealed",
        "encryption_mode": "sealed",
        "encrypted_payload": "AAAA",
    }),
    ("POST", "/api/v1/attestations", {
        "subject_user_id": "00000000-0000-0000-0000-000000000001",
        "kind": "initiation",
        "description": "d",
        "granted_at": "2026-01-01T00:00:00Z",
        "visibility": "personal",
        "signer_label": "x",
        "signer_public_key": "AA==",
    }),
    # Publishing.
    ("POST", "/api/v1/publications", {
        "kind": "essay", "title": "t",
    }),
    ("GET", "/api/v1/publications", None),
    (
        "GET",
        "/api/v1/publications/00000000-0000-0000-0000-000000000000/book-pdf",
        None,
    ),
    ("GET", "/api/v1/subscribers", None),
    ("POST", "/api/v1/subscription-tiers", {"name": "t"}),
    ("POST", "/api/v1/newsletter-issues", {"subject": "s"}),
    ("GET", "/api/v1/newsletter-issues", None),
    # Stripe Connect / Purchase refund link.
    ("POST", "/api/v1/stripe-connect/account", None),
    ("GET", "/api/v1/stripe-connect/account", None),
    # Media / uploads / pilgrimage.
    ("GET", "/api/v1/media", None),
    ("POST", "/api/v1/media/uploads/begin", {}),
    ("GET", "/api/v1/pilgrimage-sites", None),
    ("GET", "/api/v1/ical-feed", None),
    # Practice + Resh + Practice logs.
    ("POST", "/api/v1/practice/body", {
        "kind": "asana", "posture_or_pattern": "x", "duration_seconds": 60,
    }),
    ("POST", "/api/v1/practice/banishing", {"method": "lbrp"}),
    ("POST", "/api/v1/resh/adorations", {"transition": "sunrise"}),
    ("POST", "/api/v1/practices", {
        "name": "p", "cadence": "daily", "glyph": "x",
    }),
    # Analytics + digest + query + synchronicities + studies +
    # gematria search.
    ("GET", "/api/v1/analytics/today", None),
    ("GET", "/api/v1/digest/weekly", None),
    ("GET", "/api/v1/synchronicities", None),
    ("POST", "/api/v1/studies", {
        "name": "s", "kind": "gematria_search",
    }),
    ("POST", "/api/v1/gematria/search", {"value": 42}),
    # Ciphers.
    ("POST", "/api/v1/ciphers", {
        "name": "c", "language": "hebrew",
    }),
    # User settings + identities + today ledger + search + weather.
    ("GET", "/api/v1/users/me/settings/location", None),
    ("GET", "/api/v1/identities", None),
    ("GET", "/api/v1/today/ledger", None),
    ("GET", "/api/v1/search", None),
    ("GET", "/api/v1/weather/current", None),
    # Schedule (Phase 04 admin queue).
    ("GET", "/api/v1/schedule/upcoming", None),
    # Audio attachments + transcription (v1-012).
    (
        "POST",
        "/api/v1/audio/00000000-0000-0000-0000-000000000000/transcribe",
        None,
    ),
    # Wellbeing — crisis-aware nudge (v1-010). Doubly important: the
    # response is derived from private mood data.
    ("GET", "/api/v1/wellbeing/nudge", None),
    # Magickal bundles (v1-011, ADR-0011).
    ("GET", "/api/v1/bundles/installed", None),
    # Uninstall (v1-033) — record-only removal, owner-gated.
    (
        "DELETE",
        "/api/v1/bundles/installed/00000000-0000-0000-0000-000000000000",
        None,
    ),
    ("POST", "/api/v1/bundles/preview", None),
    ("GET", "/api/v1/bundles/export?type=pantheon", None),
    # Bundled content packages (v1-020).
    ("GET", "/api/v1/bundles/bundled", None),
    ("POST", "/api/v1/bundles/bundled/hellenic-pantheon/import", None),
    # Memorial executor key-share (v1-018). Doubly important: the
    # request body is vault key material.
    ("POST", "/api/v1/memorial/key-share", {
        "secret_b64": "QUFBQQ==", "shares": 3, "threshold": 2,
    }),
    ("POST", "/api/v1/memorial/key-share/verify", {
        "secret_b64": "QUFBQQ==",
    }),
    # Mode A vault-key rotation (v1-027 · Phase 15 B5). Doubly
    # important: rotation is a security-sensitive vault operation.
    ("POST", "/api/v1/keys/rotate", None),
    ("GET", "/api/v1/keys/rotation-status", None),
    ("GET", "/api/v1/keys/history", None),
    # Vault-side MCP (v1-031 · Phase 16 close-out). Doubly important:
    # this is the agent daemon's read window into vault content — it
    # must resolve ONLY a live agent MCP bearer token.
    ("POST", "/api/v1/mcp", {
        "jsonrpc": "2.0", "method": "read.entries", "params": {}, "id": 1,
    }),
    # Agent cost dashboard proxy (v1-031).
    ("GET", "/api/v1/agents/costs/summary", None),
    # Federation peer directory (v1-026). Operator-facing; auth runs
    # before the transport-disabled 503 check.
    ("GET", "/api/v1/federation/peers", None),
    ("POST", "/api/v1/federation/peers", {
        "base_url": "https://peer.example.com",
    }),
    # Group rituals (v1-031). The declare-egregore path writes an
    # entity into the caller's vault — never anonymous.
    ("POST", "/api/v1/group-rituals", {
        "title": "t", "scheduled_for_utc": "2026-01-01T00:00:00Z",
    }),
    ("GET", "/api/v1/group-rituals", None),
    (
        "POST",
        "/api/v1/group-rituals/00000000-0000-0000-0000-000000000000/"
        "declare-egregore",
        {"name": "e"},
    ),
    (
        "GET",
        "/api/v1/group-rituals/00000000-0000-0000-0000-000000000000/"
        "fragments",
        None,
    ),
    # Plugin lifecycle + install-from-registry (v1-032). Doubly
    # important: install-from-registry writes code to disk — auth runs
    # before any registry fetch or unpack.
    ("GET", "/api/v1/plugins/installed", None),
    ("POST", "/api/v1/plugins/install-from-registry", {
        "slug": "example-cipher",
    }),
    ("GET", "/api/v1/plugins/registry/search", None),
    # Registry SSO assertion minting (v1-032) — a signed identity
    # assertion must never be mintable anonymously.
    ("POST", "/api/v1/sso/registry-assertion", None),
    # Operator health dashboard (v1-041) — service topology is not
    # public; admin.observe scope only.
    ("GET", "/api/v1/admin/health", None),
]


@pytest.mark.parametrize(
    ("method", "path", "body"),
    AUTH_REQUIRED_ENDPOINTS,
    ids=[f"{m}-{p}" for m, p, _ in AUTH_REQUIRED_ENDPOINTS],
)
@pytest.mark.asyncio
async def test_endpoint_rejects_unauthenticated_call(
    app: Any,
    method: str,
    path: str,
    body: dict | None,
) -> None:
    """Every listed endpoint MUST return 401 without credentials.

    The list is exhaustive per-router — one entry per router in
    ``backend/theourgia/api/routers/v1/``. If we ever add a new
    router, add a line above.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        if method == "GET":
            response = await ac.get(path)
        elif method == "POST":
            response = await ac.post(path, json=body if body is not None else {})
        elif method == "PATCH":
            response = await ac.patch(path, json=body if body is not None else {})
        elif method == "DELETE":
            response = await ac.delete(path)
        else:
            raise AssertionError(f"unsupported method {method!r}")

    assert response.status_code == 401, (
        f"{method} {path} returned {response.status_code}, expected 401. "
        f"Body: {response.text[:200]}"
    )
