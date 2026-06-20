# Phase 02 — Batch 12: Session bootstrap (demo signin)

> **Scope target:** make the AuthContext load-bearing by adding the minimum auth HTTP routes the frontend already calls. A "demo signin" endpoint creates / fetches a hardcoded development user, opens a real Session row, sets an HttpOnly cookie. Real WebAuthn ceremony is a later batch.
>
> After this, the AuthContext flips from `unauthenticated` to `authenticated` with a real user, Today's greeting becomes the real display name, and the substrate is honest end-to-end.

## What this batch includes

### Backend (`backend/theourgia/api/routers/v1/auth.py`)

Four endpoints:

- `POST /api/v1/auth/demo-signin` — body `{ "magickal_name": string }`:
  - Find-or-create a User with email `<slug>@dev.theourgia.com` where slug is a deterministic ASCII-fold of `magickal_name`
  - Generate an opaque 32-byte session token; store SHA-256 in `session.token_hash`
  - Create a Session row with `expires_at = now + 7 days`
  - Set HttpOnly + Secure + SameSite=Lax cookie `theourgia_session=<token>`
  - Return `SessionRead { user_id, display_name, magickal_name, vault_id: null, expires_at }`
- `GET /api/v1/auth/session` — read the cookie, look up the Session, return SessionRead, 401 otherwise
- `DELETE /api/v1/auth/session` — set revoked_at on the Session, clear the cookie, return 204
- A small `get_current_session` dependency (in `api/deps.py`) that the entries router can opt into in a later batch

### Frontend

- `AuthContext.signInDemo({ magickal_name })` method
- `apiMethods.demoSignIn(input)` — calls `POST /api/v1/auth/demo-signin`
- `apiMethods.getCurrentSession()` and `apiMethods.signOut()` are already shaped from Batch 7 — they get a one-line update to actually call the live backend (drop the `NotImplementedError`)
- A tiny **Sign in** surface accessible from PublicChrome when unauthenticated, OR from a "Sign in" button on the Connection diagnostic page. We'll add it to Connection for now since that's where unauth state is already surfaced.
- Today's `MOCK_IDENTITY` falls back to the session's display name when authenticated

### Tests

- Backend: demo-signin creates a user when one doesn't exist; reuses one when it does; sets the cookie; session GET returns it; DELETE revokes it; expired session 401s
- Frontend: AuthContext.signInDemo flips status to authenticated; signOut returns it to unauthenticated; useSession reflects the new user

## Out of scope (later)

- Real WebAuthn registration + login ceremonies
- Password / TOTP login
- "Sign up" surface with magickal-name validation, RP config
- CSRF middleware (Lax cookie + same-origin is enough for now)
- Owner-gating on the entries endpoints — `owner_id` stays nullable until full auth ships

## Acceptance criteria

1. `curl -X POST https://dev.theourgia.com/api/v1/auth/demo-signin -d '{"magickal_name":"Soror Eva"}'` returns SessionRead + sets cookie
2. `curl -b cookie.txt https://dev.theourgia.com/api/v1/auth/session` returns the session
3. `curl -b cookie.txt -X DELETE https://dev.theourgia.com/api/v1/auth/session` → 204, subsequent GET → 401
4. AuthContext on https://dev.theourgia.com/admin/connection shows the demo signin button; clicking it flips status to authenticated; signOut returns it to unauthenticated
5. 986 → ~995 backend tests; 321 → ~325 frontend tests
6. Deployed
