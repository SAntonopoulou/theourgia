# Phase 12 — Federation

> The Theourgia native federation protocol. Network hubs. Selective sync between vaults and hubs. Multi-network membership. Private viewer accounts. Network curation tools. The group ritual coordinator. The architecture that turns Theourgia from a personal tool into magical infrastructure.

## Goal

Enable magicians on different instances to form networks, coordinate group work, and share selectively — while keeping all private content under the magician's control. The same software runs as a personal vault, a network hub, or both; the federation protocol makes them communicate cleanly.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — federation primitives (keys, signatures, capability tokens)
- Phase 02–11 — all the content surfaces that get federated

## Deliverables

### 1. Federation protocol specification
- Documented in `docs/developer/federation-protocol.md` as a versioned spec
- Transport: HTTPS with HTTP Signatures (RFC 9421 preferred)
- Identity: `did:theourgia:{host}:{slug}`
- Authentication: Ed25519 signed messages with capability tokens
- Message types: `Push`, `Pull`, `Mirror`, `Invite`, `Accept`, `Revoke`, `RitualSchedule`, `RitualUpdate`, `Comment`, `Heartbeat`
- Versioning: protocol version negotiated on first contact; backward-compat policy

### 2. Network hub functionality
- Hubs are first-class on any instance
- `hub` table from Phase 01 fully realized: name, slug, description, tradition_tags, visibility settings, public face configuration, member list (m2m via `membership` with role: admin / officer / member / observer)
- Hub admin surface:
  - Member management (invite, approve, suspend, expel; with audit log)
  - Network feed of pushed content from members
  - Curation queue (officers review content for newsletter / network face)
  - Public-face configuration (what shows up on the hub's public page)
  - Network settings (analytics opt-in defaults, content acceptance rules)

### 3. Vault ↔ hub sync
- Per-entry "publish to network" action: select one or more hubs the vault is a member of, push a network-shared version of the entry
- Pushed content: full structure (entry, divination, etc.) + visibility=`network:{hub_id}`
- Hub indexes pushed content; admins can curate
- Vault retains canonical ownership; revoking from network is supported (with explicit "content already mirrored may persist in caches" disclosure)
- Per-content-type defaults: e.g., "always offer to push my rituals to OTO Local Body hub"

### 4. Multi-network membership
- A vault can be a member of arbitrarily many hubs
- Per-hub visibility scopes: a vault might `share workings with Hub A, publishable books with Hub B, synchronicities anonymously with Hub C`
- Cross-hub queries: "what's happening across all my hubs today"

### 5. Private viewer accounts (extension of Phase 01 model)
- Vault owner mints a private-viewer credential (email + passphrase or signed-link)
- Private viewers get a read-only view of `viewer`-visibility content
- Per-viewer access scopes: which content they can see (by tag, kind, or specific entries)
- Used for: sharing with a specific student, partner, working group; OTO body sharing with members not on the same instance

### 6. Group ritual coordinator
- `group_ritual` table: id, hub_id (or vault_id for invited-friends rituals without a hub), title, description, ritual_template_id, scheduled_for_utc, location (physical / virtual / dispersed), participants (m2m with role + status: invited / accepted / declined / completed-individually), required_correspondences, shared_script, shared_sigils, shared_voces_magicae
- Cross-timezone display: each participant sees the scheduled time in their local time + their local planetary hour at that moment + their local lunar phase
- Coordination flow: hub officer schedules → invites sent → members accept/decline → reminders fire → at the time, all participants in "ritual mode" can see a shared script + post fragmentary updates (which become a shared post-mortem)
- Post-ritual: collective log entry with each participant's contribution; analytics across participants
- Egregore creation flow: a group ritual can declare itself as a servitor / egregore creation event, registering the resulting entity in all participating vaults

### 7. Federation peer browser
- Each instance maintains a list of known peers (other Theourgia instances)
- Discovery: well-known endpoint + DNS-based + manually added
- Per-peer status: handshake successful / pending / refused / blocked
- Optional public directory of opt-in instances (community-maintained registry as a hub)

### 8. Trust and abuse handling
- Per-hub admin: block users, instances, content
- Federation-wide blocklist (community-maintained, opt-in subscription)
- Report mechanism on all federated content
- Audit log of all federation activity

### 9. Network curation tools
- Officers can mark member submissions as "feature in public face," "include in next newsletter," "highlight in this week's digest"
- Editorial workflow: draft → review → approved → published
- Versioning and rollback for hub-published content

### 10. Frontend
- Hub admin dashboard
- Hub member dashboard
- "My networks" surface in the vault (memberships, pending invitations, hub events)
- Group ritual UI (scheduler, invite UI, ritual-time shared surface, post-mortem)
- Federation peer browser (admin)
- Private viewer management (vault owner)

### 11. APIs
- All federation endpoints under `/api/v1/federation/`
- Hub management endpoints
- Group ritual endpoints
- Private viewer management endpoints
- `POST /api/v1/sso/authorize` — issue SSO assertion to a target hub
- `POST /api/v1/sso/verify` — verify an SSO assertion from another instance
- `GET/POST/PATCH /api/v1/hubs/:id/roles` — role definitions
- `GET/POST/PATCH /api/v1/hubs/:id/permissions` — permission matrix
- `GET /api/v1/hubs/:id/audit` — network-level audit log

### 12. Single Sign-On across networks
- **Theourgia SSO** based on the federation protocol's per-instance Ed25519 keys
- A magician can use one identity to request joining public networks, ask to join private ones
- **Per-network opt-in** — hubs choose whether to accept SSO authentication (set in hub admin)
- **Used for**:
  - Joining public networks one-click
  - Requesting access to private networks
  - Comment authentication on individual vault sites
  - Subscription sign-in
  - Bundle download authorization for paid / restricted bundles
- **No central SSO server** — identity provision flows through the user's home vault instance via federation
- **Per-claim signing** — SSO assertions are scoped (e.g., "this magician is requesting join to this hub") and time-limited
- **Revocation** — SSO assertions can be revoked by the home instance immediately

### 13. Admin permissions panel
- **Configurable user levels per hub** — admin-defined roles with granular permission sets
- **Default role bundles** (extensible):
  - `admin` — full control of the hub
  - `officer` — moderate content, manage members, send newsletters
  - `moderator` — moderate content only
  - `member` — full content access, can submit to curation
  - `observer` — read-only public/network content
- **Per-permission matrix** — exhaustive list of granular permissions:
  - Edit hub content, moderate submissions, manage members, send newsletters, run analytics queries, accept federation peers, edit role definitions, manage permission matrix, view audit log, etc.
- **UI**: admin panel with role table; per-role checkbox matrix; "preview as role X" feature for testing
- **Per-action audit log** — every admin-panel change is itself logged
- **Permission templates** — pre-built role bundles for common cases (coven, lodge, study group, scholarly working group)
- **Clear feedback** — permission-denied actions surface "you cannot do X because you lack permission Y" with link to escalation path

### 14. Enhanced audit log for networks
- Network-level audit surface extending the per-vault audit scaffold from plan/01 §10
- **Visible to**:
  - Hub admins: all events
  - Hub members: events affecting them or content they authored
  - Compliance auditors (for GDPR/DPIA): exportable filtered view
- **Event types logged**:
  - All admin-panel changes (role, permissions, members)
  - All content moderation actions
  - All federation operations (peers added/removed, capability tokens issued/revoked)
  - All member access changes
  - All bundle publications
  - All newsletter sends
- **Filterable** by actor, time range, action type
- **Exportable** for GDPR / DPIA / compliance reviews

## Design notes

- Federation is the place where bugs become security incidents quickest. Threat-model thoroughly.
- The protocol must be implementable by alternative clients. Document it as a spec, not as the implementation.
- Group ritual UX must work across abysmal-internet conditions. Local-first state, deferred sync.
- Private viewers should not require a Theourgia account elsewhere (low friction for sharing).

## Risks

- **Risk:** Capability token misuse. **Mitigation:** Short token lifetimes; explicit per-operation capability scopes; revocation tested end-to-end.
- **Risk:** Federation message replay. **Mitigation:** Nonces + timestamp windows in signed envelopes.
- **Risk:** Hub admin abuse of curation power. **Mitigation:** Transparent edit history visible to all members; member-side rollback (a member can unpublish their own content from the hub at any time).
- **Risk:** Cross-timezone group ritual UX confusion. **Mitigation:** Always show times in local + UTC; never assume; ritual-prep checklist surfaces this.

## Definition of Done

- [ ] Two test instances handshake, exchange identity, sync hub membership
- [ ] Vault pushes content to a hub, hub indexes, member views in network feed
- [ ] Private viewer credential issued, viewer reads scoped content from a remote instance
- [ ] Group ritual scheduled across three time zones with planetary-hour display per participant
- [ ] Hub officers curate a network newsletter from member submissions
- [ ] Federation protocol spec published in `docs/developer/`
- [ ] Replay-attack and tampering tests pass
- [ ] Revocation and block flows tested
- [ ] Performance: 100 connected vaults per hub with sub-second sync
