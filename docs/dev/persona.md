# Persona — developer guide

Multi-identity layer above User. Every user has at least one persona — the `default` one auto-created at signup. Users who want separate practice contexts (public teaching face vs. intimate working face) create additional personas.

See `plan/persona-decision-2026-06-21.md` for the architectural rationale.

## The substrate at a glance

```
core/persona/
└── service.py    # PersonaService (lifecycle ops)

models/persona.py    # Persona table + PersonaKind enum
```

Plus integration into:

- `models/identity.py` — `Session.active_persona_id`
- `models/audit.py` — `AuditEvent.actor_persona_id`
- `core/authz/context.py` — `AuthzContext.active_persona_id`
- `core/authz/policies.py` — `owner_only_policy` checks persona before user

## Pattern: signup auto-creates a default persona

When a user signs up (Phase 02/03 auth flow), the handler calls:

```python
from theourgia.core.persona import PersonaService

async def signup(email: str, password: str, session: AsyncSession):
    user = User(email=email, password_hash=hash_password(password))
    session.add(user)
    await session.flush()

    service = PersonaService(session)
    default = await service.create_default_for_user(
        user_id=user.id,
        handle=email.split("@")[0],  # or whatever signup UI captures
        display_name=email.split("@")[0],
    )

    # The new session points at this persona
    session_row = Session(
        user_id=user.id,
        active_persona_id=default.id,
        token_hash=...,
        ...
    )
    session.add(session_row)
    await session.commit()
```

The default persona is structural — one per user, can't be deleted. Users who want to "delete their public face" delete their whole account.

## Pattern: secondary personas

A user can create additional personas:

```python
secondary = await service.create_secondary(
    user_id=user.id,
    handle="ritualist",
    display_name="The Ritualist",
    bio="Working in quiet.",
)
```

Secondary personas are freely creatable and deletable. The handle must be unique instance-wide; conflict raises `PersonaConflictError`.

## Pattern: switching active persona

A user "acts as" a particular persona by updating their session:

```python
# Verify the persona belongs to this user
persona = await service.get_by_id(persona_id)
if persona.user_id != current_user.id:
    raise ForbiddenError("persona not yours")

# Update the session
session.active_persona_id = persona.id
await db.commit()
```

The next request, the auth dependency reads `session.active_persona_id` and threads it into `AuthzContext.active_persona_id` — the rest of the system sees the user acting through that persona.

## Pattern: writing content that's persona-owned

New content tables (Phase 02+) should have `owner_persona_id`, not `owner_id`:

```python
class Entry(IDMixin, TimestampMixin, table=True):
    __tablename__ = "entry"
    resource_type: ClassVar[str] = "entry"

    owner_persona_id: UUID = Field(
        sa_column=Column(
            ForeignKey("persona.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    # ... rest of the entry fields ...
```

The authorization substrate's `owner_only_policy` already knows how to check `owner_persona_id` against `context.active_persona_id` — no per-feature logic needed.

## Handle rules

Handles are ASCII alphanumeric plus underscore and hyphen, 3–64 chars, must start with a letter, can't end with hyphen or underscore. Same shape as a federation actor identifier; matches what most ActivityPub implementations accept.

```python
"alice"          # ✓
"soror_eua"      # ✓
"ritualist_42"   # ✓
"AliceCaps"      # ✓ (case-insensitive uniqueness; CITEXT in DB)

"_underscore"    # ✗ starts with underscore
"1numeric"       # ✗ starts with digit
"trailing_"      # ✗ trailing underscore
"has spaces"     # ✗ whitespace
"x"              # ✗ too short
```

## What stays at the User level

Not everything moves to persona:

| Concern | Lives on | Why |
|---|---|---|
| Login / password / TOTP / WebAuthn | User | One auth identity per real person |
| Session | User (with `active_persona_id`) | The session is the auth principal's; persona is dynamic |
| Per-user settings (theme, density, accessibility) | User | A user doesn't usually want different themes per persona |
| Notification preferences | User | One notification policy across personas |
| Email address | User | Single mailbox per account |
| Push subscriptions | User | Device-level, not persona-level |

What lives on Persona:

| Concern | Lives on |
|---|---|
| Federation actor (ActivityPub `attributedTo`) | Persona |
| Public bio / display name | Persona |
| Content ownership (new tables) | Persona |
| Default visibility for new content | Persona |
| Sealed-encryption key derivation (Phase 03+) | Persona |
| Hub memberships (eventually; Phase 02 will decide) | Persona OR User (TBD) |

## Audit log

Every audit row now has both `actor_id` (the User who authenticated) and `actor_persona_id` (which persona was active). Forensic queries get exact answers:

- "Who did this?" — `actor_id`
- "Which persona did they do it as?" — `actor_persona_id`

The two-column scheme avoids the ambiguity of recording only a persona id (then who deactivated the account? whose persona was it?).

## Testing

Unit tests for the service exist (`tests/test_persona.py`) and cover handle validation, the error hierarchy, and the `owner_only_policy` updates. Full database-integration tests (signup → default persona created → switch persona → owns content) land alongside the auth-flow feature work in Phase 02/03 when a real-database test fixture is in place.

## What still needs doing

This substrate ships **without** API endpoints. The endpoints (`POST /api/v1/me/personas`, `PUT /api/v1/me/personas/{id}/activate`, etc.) land with the Phase 02 account-management UI. The substrate is in place so those endpoints are wiring, not invention.

Also pending (not blocking):

- Migration of existing `Vault` table semantics — Vault stays for now, content owned by user. Future refactor may consolidate Vault into Persona; for now they coexist (Persona is the social face, Vault is the optional data-container layer underneath).
- Sealed-encryption key derivation tied to persona — comes with Phase 03 encryption work.
- Federation actor URIs for personas — comes with Phase 13 federation engine.
