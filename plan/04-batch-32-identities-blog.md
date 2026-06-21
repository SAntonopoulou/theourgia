# Phase 04 — Batch 32: Multi-identity authoring + blog feeds

> Wires the `authored_by_persona_id` Entry column (Batch 28 added the column) through the read + write API; ships `/api/v1/identities` for the editor's identity picker; ships RSS / Atom / JSON Feed for blog-kind entries.

## Substrate

### Entry API extension

`backend/theourgia/api/routers/v1/entries.py`:
- `EntryRead.authored_by_persona_id: str | None` — wire format includes the persona-id when set.
- `EntryCreate.authored_by_persona_id: str | None` — write payload accepts it.
- `_to_read` serialises the column; `create_entry` writes through.
- Backwards compatible: pre-Batch-32 clients that don't send the field still work.

### Identities API

`backend/theourgia/api/routers/v1/identities.py`:
- `GET /api/v1/identities` — list the caller's active personas.
- `GET /api/v1/identities/{id}` — single persona; public-faced personas readable by anyone.
- `GET /api/v1/me/identities/default` — the caller's default persona (the editor's fallback author).
- Read-only — the create / update / archive surface lives in the Phase 01 persona admin router.

### Blog feeds

`backend/theourgia/api/routers/v1/blog.py`:
- `GET /api/v1/blog/posts?limit=&offset=` — list public, non-encrypted, non-soft-deleted entries of kind `blog_post`, excluding posts whose `scheduled_publish_at` is in the future.
- `GET /api/v1/blog/feed.xml` — Atom 1.0, last 50 posts.
- `GET /api/v1/blog/feed.rss` — RSS 2.0.
- `GET /api/v1/blog/feed.json` — JSON Feed 1.1.

Per-vault feeds (`/v/{handle}/blog/feed.xml`) land when the multi-tenant routing is settled (Phase 12 federation).

## Tests

`backend/tests/test_identities_blog.py` — 7 tests:
- Identities router registers 3 endpoints.
- `IdentityRead` Pydantic shape.
- `EntryRead.authored_by_persona_id` field present.
- `EntryCreate` accepts the persona id.
- Blog router registers 4 endpoints (posts + 3 feeds).
- `BlogPostsResponse` shape.
- Magickal-name memory check on demo handle set.

**Full backend suite: 1170 tests pass** (+7 new).

## Deferred to designer / future batches

- **Per-post comments + moderation** — `plan` §13 calls for "Per-post comments with moderation (opt-in per post)". Substrate is a `comment` table FK to `entry`; full UI is a designer hand-off (queued).
- **Per-identity scoped private notes on entities** — the persona substrate exists; the `EntityNote` model (Phase 05) will pick up the persona-id when it lands.
- **RSS/Atom feed for an individual persona's posts** — the existing feed lists every public blog post site-wide. The per-persona feed at `/v/{handle}/blog/feed.xml` is queued behind the federation routing work.
- **Comments + likes federation** — Phase 13 ActivityPub.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 API ready; editor wire in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| Templates | 🟡 Built-ins + save/load; UI designer hand-off |
| Search | ✅ Lexical + filters |
| Body sensation | ⏳ Batch 34 |
| Audio | ⏳ Batch 34 |
| Library catalog | ✅ |
| `/quote` autocite | 🟡 Data layer ready; UI in Batch 35 |
| Print export | ⏳ Batch 36 |
| Visibility downgrade flow | 🟡 Schema ready; UI in handoff #2 |
| Encryption | 🟡 Column ready |
| Performance benchmark | 🟡 Indexes added |
