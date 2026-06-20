# Persona / multi-identity decision — 2026-06-21

**Status:** Decision recorded; implementation deferred to land alongside the first feature that benefits (likely Phase 02 / Phase 03 — account creation and journal entries).

**Author:** Soror Ευ. Α. + Claude (collaboration session, 2026-06-21).

## Context

Theourgia from day one was specified to support multi-identity / pseudonymity. A practitioner often wants more than one face:

- A public-facing teaching persona ("Soror Ευ. Α." for published work).
- An intimate practice persona — anonymous, separate audit trail, separate sealed-encryption keys.
- A working-name persona used within a specific OTO body or coven.
- Throwaway personas for sensitive correspondence with federated peers.

The Phase 01 data model has a single `User` row per account. Every content table references `user_id`. Without a deliberate architectural decision now, every feature that ships will hard-code "the user owns this content" — and retrofitting personas later would touch every model with a foreign key.

This document records the chosen architecture so feature work proceeds with the right assumptions baked in.

## Options considered

### Option A — `Persona` as a separate table, content references `persona_id`

```
User       ← auth identity (email, password_hash, totp_secret, sessions)
  └─ Persona[] ← social/content identity (display_name, bio, default_visibility)
       └─ Entry[], Divination[], Sigil[], ... ← all reference persona_id
```

- **Pros:** Clean ACL boundary; persona switch is a global "act-as" change without re-auth; federation actors map naturally to personas; audit can record both `acting_user_id` and `acting_persona_id` for forensics.
- **Cons:** Most invasive migration. Every content table's foreign key changes.

### Option B — Multiple `User` rows per account, linked by `Account`

```
Account     ← billing / login boundary
  └─ User[]  ← each one is a persona, with its own email-equivalent + login route
       └─ Entry[], etc. ← reference user_id (unchanged)
```

- **Pros:** Minimal change to existing tables (user_id stays). Each persona can have its own session, password, TOTP — strong isolation.
- **Cons:** Awkward auth UX (which "user" is signing in?). Federated peers see distinct accounts unless we expose the Account layer (which leaks the link). Sharing infrastructure (notification preferences, settings) between personas of one account becomes its own design problem.

### Option C — No personas; just `display_name` + `handle`

User picks a different display name per context, but it's all one identity.

- **Pros:** Simplest schema. Familiar pattern (most social apps).
- **Cons:** Doesn't actually solve the problem. A practitioner who wants their public teaching persona separate from their intimate practice persona ends up doing it via two accounts (defeating the "linked" goal) or via a single account (defeating the "separate" goal).

### Option D — Option A but every User auto-creates a default Persona

```
User              ← auth (one per real person)
  └─ Persona[]    ← always at least one ("default"); user can add more
       └─ Entry[], ... ← persona_id
```

A merged form of A: the schema is A's, but signup ensures every User has a Persona row automatically, so single-persona users see no UI complexity until they want a second persona.

## Decision

**Option D.** Persona is a first-class table; content references `persona_id`. Every User auto-creates a default Persona at signup. Multi-persona is a feature users opt into; single-persona users see no friction.

Rationale:

1. **Right ACL boundary.** Sealed content keyed per-persona means a compromised "public teaching" persona doesn't expose the "intimate practice" persona's content even within the same User.
2. **Federation alignment.** ActivityPub actors map to personas. A practitioner who federates from one persona doesn't need to federate the other.
3. **Audit clarity.** Recording both `acting_user_id` (who signed in) and `acting_persona_id` (which persona was active) gives forensic precision without ambiguity.
4. **Schema honesty.** Option A's migration pain is one-time; the alternative is N-time pain as future features inline persona-shaped logic.
5. **No UX cost for the common case.** Single-persona users never see the concept. The persona table is an internal abstraction until they opt in.

## Proposed schema

```
User (existing, unchanged)
  - id (UUID)
  - email
  - password_hash
  - totp_secret
  - email_verified_at
  - locked_until
  - failed_login_count

Persona (new)
  - id (UUID)
  - user_id (FK User, ON DELETE CASCADE) — who controls this persona
  - kind ("default" | "secondary") — the auto-created one per User is "default";
                                     additional personas the user creates are "secondary"
  - handle (str, unique) — federation identifier, e.g. "soror_eua@theourgia.example.com"
  - display_name (str)
  - bio (str, optional)
  - avatar_upload_id (FK Upload, optional)
  - default_visibility (Visibility, default PERSONAL)
  - is_active (bool) — soft-deactivation distinct from delete
  - created_at, updated_at
  - UNIQUE(user_id, kind="default") via partial index — exactly one default per user

Session (existing, modified)
  - id, user_id, token_hash, expires_at, etc. (unchanged)
  - active_persona_id (FK Persona, defaulted at login to the default persona)
    — captures which persona is "active" for this session; persona switch
      updates this column rather than issuing a new session token

Content tables (Entry, Divination, Sigil, Entity, ...)
  - owner_persona_id (FK Persona) — replaces / supersedes user_id
```

## Implications and the migration path

When this lands:

1. **Migration `00NN_persona_introduction`:**
   - Creates `persona` table.
   - For every existing User, creates one default Persona (`kind="default"`, handle derived from User.email local-part or display name).
   - Adds `active_persona_id` to `session`, defaulting to the user's default persona.
   - For each content table that currently has `user_id`, adds `owner_persona_id` with NOT NULL and a FK to persona; backfills from the user's default persona; eventually drops `user_id` after the application is updated.
   - Updates RLS policies on content tables to filter by persona ownership.

2. **API surface:**
   - New endpoints: `GET /api/v1/me/personas`, `POST /api/v1/me/personas`, `PUT /api/v1/me/personas/{id}/activate`, `PATCH /api/v1/me/personas/{id}` (edit), `DELETE /api/v1/me/personas/{id}` (only secondary).
   - The active persona for the current session is exposed on `GET /api/v1/me`.
   - Persona switch updates `session.active_persona_id`; subsequent requests see the new active persona.

3. **Authorization substrate (S6):**
   - The "owner" check on resources changes from `resource.owner_id == user.id` to `resource.owner_persona_id in {p.id for p in user.personas}`. The `owner_only_policy` will need updating; the change is centralized so no per-feature scramble.
   - `AuthzContext` gains `active_persona_id` (mirrors what the session carries).

4. **Federation:**
   - The ActivityPub actor URI for a persona becomes `https://<host>/@<handle>` (or the DID variant per `core/federation/identity.py`).
   - The federation keypair stays instance-wide (signs all outbound); ActivityPub `attributedTo` references the persona's actor URI.
   - DID scheme `did:theourgia:host:vault:slug` already accommodates this — `slug` becomes the persona handle.

5. **Sealed encryption (Mode B):**
   - Each persona has its own KDF salt + sealed-content key derivation, even within one User. Passphrase scope can be per-user (one passphrase unlocks all personas) or per-persona (privacy maximalism). Default: per-user passphrase with per-persona derived keys — convenient single-passphrase UX, cryptographically isolated personas.

6. **GDPR (S7):**
   - Export and deletion handlers iterate the user's personas. The export archive is keyed by persona; deletion handles content for every persona before removing the User.

7. **i18n and per-user settings (S10):**
   - Stay at the User level — they're per-account, not per-persona. A user doesn't usually want different themes for different personas.

8. **Notifications (S4):**
   - In-app notifications belong to the User but reference the relevant persona when applicable ("Your persona 'Soror Ευ. Α.' received a new follower"). Push subscriptions live on the User.

## What this means for ongoing work

**Until Persona lands** (Phase 02 / Phase 03 timeframe):

- Continue writing features that reference `user_id`. The migration backfills.
- Audit log records `acting_user_id`. Add `acting_persona_id` to the audit row schema in the migration that adds `Persona`; older rows have it as NULL.
- When designing a new content table, call the owner column `owner_id` (not `user_id`) for semantic neutrality — it'll change FK target from `user` to `persona` in the migration without churning the column name.

**As features land that touch identity** (e.g. Phase 03 auth flow):

- Wherever a feature would naturally talk about "the user", talk about "the active persona" if the answer would differ. The Phase 01 auth flow doesn't need to distinguish — `User` is the authenticated entity for the session. Content ownership is where the distinction matters.

**Open questions to revisit when implementing:**

- Should personas of the same User share notifications? (Lean: yes, with a per-persona filter.)
- Should email be User-level or Persona-level? (Lean: User-level — login is via User, persona is post-login switching.)
- Should sessions be User-scoped (one set of sessions, switch personas within) or Persona-scoped (each persona has its own sessions)? Recommendation: User-scoped with `active_persona_id` on the session row. Lower surface area; easier UX.
- Persona handle uniqueness: instance-wide (one `soror_eua` per Theourgia) or User-scoped (one user can have multiple personas with the same handle on different domains)? Recommendation: instance-wide unique (matches ActivityPub conventions).

## Why we're not implementing it now

Three reasons:

1. **No feature currently needs it.** The first user-content feature is Phase 02 territory. Implementing the migration before the first content table exists means we'd migrate a schema with no content. Pointless.
2. **The migration is significant enough** that doing it carefully — backfill scripts, RLS policy updates, every place `user_id` becomes `persona_id` — is best done as a focused effort alongside the auth/account UI, not as a speculative refactor.
3. **The decision is the part that matters.** Now that this document exists, every feature lands with the right mental model. The migration becomes a mechanical translation later.

## Sign-off

This document records the decision. Implementation lands when the first content-bearing feature ships (Phase 02 or early Phase 03). Until then, feature work proceeds with awareness that today's `user_id` becomes tomorrow's `owner_id → persona_id`.
