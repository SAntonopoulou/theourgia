# Phase 13 — ActivityPub Integration

> The bridge to the wider Fediverse. Theourgia's `public` content can be followed from Mastodon, Pleroma, GoToSocial, Friendica, and any other ActivityPub-speaking platform. Comments, follows, and announcements flow back in.

## Goal

Make Theourgia a good Fediverse citizen for its public broadcast layer, without compromising the native federation protocol or contorting the practitioner-private data model. ActivityPub is an *adapter*, not the substrate.

## Dependencies

- Phase 00–02
- Phase 04 (Journaling) — public entries are the primary content broadcast
- Phase 10 (Publishing) — publications and newsletters can be broadcast too
- Phase 12 (Federation) — the native protocol must be stable first

## Deliverables

### 1. ActivityPub actor implementation
- Each public-visible vault and hub is an `Actor`
- Per-actor: `inbox`, `outbox`, `followers`, `following`, `liked`, `public-key` endpoints
- WebFinger support: `acct:sophia@theourgia.com` resolves to the actor
- NodeInfo endpoint with project identification
- Implements `Person`, `Service`, `Group` actor types as appropriate

### 2. Object types
- `Note` for short status-like posts (synchronicity log entries marked public, brief observations)
- `Article` for long-form journal entries marked public
- `Document` for downloadable publications
- `Event` for group rituals visible publicly
- Custom extensions documented in `docs/developer/activitypub-extensions.md`:
  - `theourgia:Ritual` (extends Event with timing/correspondence metadata)
  - `theourgia:Divination` (extends Note with structured reading metadata)
  - `theourgia:Sigil` (extends Image with generation parameters)
  - These render as Note/Article/Image in vanilla AP clients (graceful degradation)

### 3. Outbound activities
- On publish-public: emit `Create` activity for the new object to all followers
- On update: emit `Update`
- On delete: emit `Delete` (with tombstone)
- On comment from a Theourgia user: emit appropriate `Create(Note)` with `inReplyTo`
- On newsletter issue publish: optionally cross-post a teaser as `Article` with a link to the full issue

### 4. Inbound activities
- `Follow`: accept follow requests (auto-accept by default, configurable to manual approval)
- `Undo Follow`: handle unfollows
- `Like`: record on the relevant object (visible to the magician)
- `Announce` (boost): record on the object
- `Create(Note)` with `inReplyTo`: append as a comment on the relevant object (moderation queue applies, per Phase 10)
- `Delete`: handle tombstones (remove cached content)
- Reject: malformed, oversized, or unsupported activities

### 5. Mastodon compatibility
- Test interoperability with Mastodon (primary), Pleroma, GoToSocial, Akkoma, Friendica
- Account discovery (`@user@instance`)
- Avatar / banner / display name / bio mapped from vault profile

### 6. Privacy and visibility
- ActivityPub only sees `public` content. `viewer`, `network`, `personal`, and `sealed` content **never** flows through the AP layer. Hard-prevented at the data-fetch layer.
- Followers list visibility is per-actor choice (public, hidden)
- Boost / like aggregation respects original-object visibility

### 7. Cryptographic posture
- HTTP Signatures for all outbound activities (per ActivityPub spec)
- Verifies inbound signatures; rejects unsigned or invalid
- Per-actor key pair (rotatable)

### 8. Federation queue
- Outbound deliveries processed via Celery with retry/backoff
- Inbound activities queued for processing; idempotent handlers
- Dead-letter queue for malformed messages

### 9. Discovery
- WebFinger
- NodeInfo / NodeInfo 2.0
- Featured collections (pinned entries → AP `Featured` collection)

### 10. Frontend
- ActivityPub follower count and recent followers displayed on vault dashboard (optional)
- Per-entry view shows AP boost / like counts when relevant
- Comment view shows federated comments inline with local ones, marked with source instance

### 11. APIs
- All AP endpoints under `/.well-known/webfinger`, `/users/:slug`, `/users/:slug/inbox`, `/users/:slug/outbox`, etc.
- Documentation aligned with ActivityPub spec linking

## Design notes

- ActivityPub is best understood as a translation layer. Do not contort internal data structures to match AP idiom; convert at the boundary.
- The Fediverse has its own etiquette; document opinions: opt-in follower-approval, content warnings for ritual content (use AP `summary` field), no auto-DM of new followers.
- Custom extensions render as base types in non-Theourgia AP clients. This is the right tradeoff.

## Risks

- **Risk:** Activity flood causing federation queue backup. **Mitigation:** Rate limits per inbound peer; queue depth alerts.
- **Risk:** Bad-faith Fediverse actors (spam, harassment). **Mitigation:** Block/mute at peer level; community blocklist subscription.
- **Risk:** Object-type mismatches confuse other clients. **Mitigation:** Graceful degradation always; test against the actual major implementations.

## Definition of Done

- [ ] A Mastodon user can follow a Theourgia vault and see public entries
- [ ] A Theourgia vault can follow a Mastodon account (optional consumer side, lighter scope)
- [ ] Boosts and likes from Mastodon register on the original Theourgia object
- [ ] Comments from Mastodon appear in the moderation queue and, once approved, display correctly on the public page
- [ ] WebFinger resolves correctly
- [ ] HTTP Signatures verified bidirectionally
- [ ] Custom extensions render gracefully in Mastodon as base AP types
- [ ] Privacy layer verified: no non-public content leaks via AP
- [ ] Performance: 10,000 followers, daily post fan-out completes within 5 minutes
