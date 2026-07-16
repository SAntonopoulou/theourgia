# Data Protection Impact Assessment (DPIA) — template

This is a fill-in DPIA template for a Theourgia instance operator. It is structured to satisfy GDPR Article 35(7) and follows the EDPB-endorsed WP29 DPIA guidelines (wp248 rev.01). The Theourgia-specific parts — what the platform processes, what it deliberately does not, and which built-in features mitigate which risks — are pre-filled and accurate as of v1. Your job is the parts marked `{{LIKE_THIS}}` and the risk scoring, which depends on who your users are.

**Is this legal advice?** No. For a personal instance or a small hub of consenting adults, this template plus an honest afternoon is a defensible DPIA. If you run a **multi-user hub at scale**, enable **paid publishing**, or process data of **minors or people at risk** (practitioners in jurisdictions or families where their practice must stay hidden), have a professional review the finished document. The stakes section below explains why.

**Why this product needs a DPIA at all.** Nearly everything a Theourgia vault contains is special-category data under GDPR Article 9(1): journal entries, rituals, divinations, and oaths are direct records of **religious or philosophical beliefs**. Mood and body snapshots are **health-adjacent**. Pilgrimage sites are **location data**, sometimes of a user's home. This is not incidental metadata — it is the product. Treat the assessment accordingly.

---

## 0. Do you need a DPIA?

Work through this before filling anything in.

| Your situation | GDPR position |
|---|---|
| Single-user instance, you are the only data subject | The household exemption (Art. 2(2)(c)) very likely applies — GDPR does not govern purely personal activity. A DPIA is not required. Filling this in anyway is still a worthwhile security exercise. |
| Multi-user instance for your household / working partner | Likely still household exemption, but the line is blurry once you hold someone else's oaths. Recommended: fill this in. |
| Hub for a coven, order, lodge, or study group | You are a **controller**. Art. 35(3)(b) makes a DPIA likely mandatory: you process special-category data, and under the WP29 nine-criteria test you hit at least "sensitive data" plus usually "vulnerable data subjects" (members whose practice is secret from family or employer). Two criteria met means do the DPIA. |
| Hub with paid publishing (Stripe) enabled | DPIA required in practice, and this is the tier where professional review is worth paying for — you now combine belief data with financial identity. |

If GDPR does not apply to you, stop here or continue for your own benefit. If it does, continue.

---

## 1. Document control

| Field | Value |
|---|---|
| Instance | `{{INSTANCE_URL}}` |
| Operator (controller) | `{{OPERATOR_NAME}}` |
| Contact | `{{OPERATOR_CONTACT_EMAIL}}` |
| DPO (if appointed — most small hubs need not appoint one) | `{{DPO_NAME_OR_NONE}}` |
| Jurisdiction / supervisory authority | `{{JURISDICTION}}` / `{{SUPERVISORY_AUTHORITY}}` |
| DPIA version / date | `{{VERSION}}` / `{{DATE}}` |
| Review due | `{{DATE_PLUS_12_MONTHS}}` |

---

## 2. Systematic description of the processing (Art. 35(7)(a))

### 2.1 Nature and purpose

Theourgia is a self-hosted vault for practicing magicians: journaling, entity records, divination logs, ritual and workshop tools, media, optional publishing, and optional federation with peer instances. The purpose of processing is **providing this service to your users, at their instruction** — there is no secondary purpose. The platform ships with **zero telemetry** (machine-verified; see §5).

### 2.2 Categories of data

| Category | Examples | Sensitivity |
|---|---|---|
| Account | Email, password hash (or WebAuthn credential), TOTP secret, magickal name, personas | Personal data; the magickal-name-to-legal-identity link is itself sensitive for many practitioners |
| Practice content | Journal entries, rituals, oaths, initiations, divinations, sigils, entity records | **Art. 9(1) — religious/philosophical beliefs.** This is the bulk of the vault. |
| Mood / body snapshots | Daily practice tracker state ratings | Health-adjacent; treat as Art. 9 health data |
| Location | Pilgrimage sites (lat/lng, quantized — see §5), site anniversaries | Location data; may reveal home or gathering places |
| Media | Uploaded images/audio; EXIF is stripped by default at upload | Content-dependent; can contain faces, places |
| Technical | Session rows (hashed token, user agent, IP address), audit log, email delivery log, reverse-proxy access logs | Personal data; retained short-term for security |
| Payment (only if publishing enabled) | Stripe customer/subscription identifiers. Card data never touches the instance — it stays with Stripe. | Financial identity linked to belief data — the highest-risk combination this product can hold |

### 2.3 Data flows and storage

- All content lives in Postgres and object storage on infrastructure the operator controls: `{{HOSTING_PROVIDER_AND_REGION}}`.
- Content encryption is per-item, two modes: **Mode A** (server-side at rest; per-item data keys envelope-wrapped by the server master key) and **Mode B / sealed** (zero-knowledge: PBKDF2-derived key, AES-GCM, encrypted in the user's browser; the server stores only ciphertext and cannot decrypt it, ever).
- Visibility is per-item: `personal` (default), `viewer`, `network`, `public`, `sealed`.
- Backups: restic, encrypted at source before upload, to `{{BACKUP_TARGET, default Cloudflare R2, region}}`. Compromised storage credentials cannot read backups.
- Outbound flows exist **only** on explicit user/operator action: federation deliveries to peers, ActivityPub, Stripe API (if enabled), email delivery via `{{EMAIL_PROVIDER_OR_NONE}}` (if enabled), backup uploads, TLS DNS-01 renewal, Anthropic API (only if a user opts in to the AI agent).

### 2.4 Recipients

| Recipient | When | What they get |
|---|---|---|
| Federation peer instances | Only content the user set to `network`/`public` AND only if the user granted the `federation.publish` consent purpose | Copies that then live **under the peer operator's sovereignty**. Deletion sends tombstones; the platform anonymizes rather than orphans federated rows, but it cannot force a peer to comply. This limit must be disclosed to users (the privacy policy template does so). |
| Stripe | Only if paid publishing enabled | Payment identity; Stripe is an independent controller for card processing |
| Email provider | Only if email/newsletters enabled | Recipient addresses and message content |
| Backup storage provider | Continuously | Ciphertext only |
| Anthropic | Only per-user opt-in to the AI agent, per invocation | Journal content the user allowed the agent to read (`ai.agent_invoke` consent purpose) |

### 2.5 Retention

- Content: until the user deletes it, or the account.
- Account deletion: user-initiated (`POST /api/v1/me/account/delete`), **30-day grace period** with one-tap reactivation, then the background reaper purges via the GDPR deletion registry.
- Backups: deleted data persists inside encrypted snapshots until they age out of `{{BACKUP_RETENTION_POLICY}}`.
- Sessions expire per configured lifetime; audit log retained `{{AUDIT_RETENTION}}`; proxy access logs `{{ACCESS_LOG_RETENTION}}`.

---

## 3. Necessity and proportionality (Art. 35(7)(b))

### 3.1 Lawful bases

| Processing | Basis |
|---|---|
| Account operation, storing content at user instruction | Art. 6(1)(b) — contract |
| Special-category content (the practice record itself) | Art. 9(2)(a) — **explicit consent**, obtained at signup with specific reference to religious/philosophical data. A not-for-profit order/lodge hub may additionally rely on Art. 9(2)(d) (members-only processing by a body with a philosophical/religious aim, no outside disclosure without consent) — if you claim this, record your membership rules here: `{{ART_9_2_D_RATIONALE_OR_NA}}` |
| Security logging (sessions, audit, lockout) | Art. 6(1)(f) — legitimate interest in securing the vault |
| Federation, AI agent, newsletter inclusion, external search indexing, aggregate stats | Art. 6(1)(a)/9(2)(a) — consent, enforced in code by the consent registry (each optional pipeline checks the corresponding `ConsentPurpose` before acting; no consent, no processing) |
| Payments | Art. 6(1)(b) contract + 6(1)(c) legal obligations (tax records, held by Stripe) |

### 3.2 Data minimization — what is deliberately not collected

- No telemetry, analytics, usage tracking, or "anonymous" IDs — verified by `backend/theourgia/scripts/verify_zero_telemetry.py`, which fails CI if an analytics SDK becomes importable, if error reporting turns on without explicit configuration, or if the public meta endpoint stops declaring `telemetry: "none"`.
- No engagement metrics, play counts, or recommendation profiling anywhere in the product — these are design rules, not just settings.
- External search indexing is **off by default** (practitioners often prefer obscurity).
- EXIF metadata (including GPS) is stripped from uploads by default.
- Legal names are never required; the platform is built around magickal names and personas.

### 3.3 Proportionality of the optional subsystems

Each higher-risk capability is opt-in and separable: federation, publishing/payments, newsletters, AI agents, and aggregate statistics can all remain off, and the instance is fully functional. Record which you actually run: `{{ENABLED_SUBSYSTEMS}}`. A subsystem you have not enabled contributes no risk and needs no further assessment.

---

## 4. Risks to data subjects (Art. 35(7)(c))

Score each risk for **your** user base: Likelihood (L) and Severity (S), low/medium/high. The severities suggested below assume the honest worst case for a practitioner: involuntary disclosure of religious practice can cost family relationships, employment, custody, or physical safety depending on jurisdiction and household.

| # | Risk | Scenario | S (typical) | L `{{fill}}` | S `{{fill}}` |
|---|---|---|---|---|---|
| R1 | Belief disclosure ("outing") | DB dump, compromised operator account, or over-broad visibility exposes a user's practice record | High | | |
| R2 | Health inference | Mood/body snapshot history read by an intruder or misused by an operator | Medium-High | | |
| R3 | Location exposure | Pilgrimage sites reveal a home altar or a group's meeting place | High | | |
| R4 | Federation persistence | User deletes content already replicated to a peer that does not honor the tombstone | Medium | | |
| R5 | Backup exposure | Old snapshots retain data the user deleted; or the restic passphrase leaks alongside storage credentials | Medium | | |
| R6 | Operator coercion / compelled disclosure | Operator is legally compelled, or socially pressured, to hand over a member's record | High | | |
| R7 | Account takeover | Credential stuffing or session theft gives an attacker the user's full vault | High | | |
| R8 | Financial-identity linkage | (Payments only) Subscriber lists tie legal payment identity to occult publications | High | | |
| R9 | Re-identification in aggregates | (Aggregate stats only) Small-cohort statistics identify an individual's practice pattern | Medium | | |

Add hub-specific risks here: `{{ADDITIONAL_RISKS}}`.

---

## 5. Measures addressing the risks (Art. 35(7)(d))

Every mitigation below is a shipped product feature, not an aspiration. The mapping tells you which risk each one actually cuts.

| Measure | What it concretely is | Mitigates |
|---|---|---|
| Sealed mode (Mode B, zero-knowledge) | Client-side AES-GCM with a PBKDF2-derived key from a passphrase the server never sees. Used for initiations, oaths, and anything the user marks `sealed`. A full database dump yields ciphertext for sealed items. Sealed items appear in shared surfaces as counts only, and sealed-day anniversaries are excluded from iCal feeds entirely. There is no unseal, promote, or key-escrow endpoint. | R1, R2, R6 (operator **cannot** comply with a demand to decrypt sealed content — an honest, structural answer to coercion) |
| Mode A encryption at rest | Per-item data keys envelope-wrapped by the server master key; a stolen disk or raw DB file without the key material is unreadable | R1, R2 |
| Default-private visibility | Everything is `personal` unless the user widens it; publishing sealed content is blocked with defence in depth at publish, checkout, and read time | R1 |
| Location precision floor | Coordinates are quantized to the chosen precision tier **at save time**; finer precision is irreversibly discarded before storage. Re-quantizing is a one-way ratchet (coarser only); no raise-precision endpoint exists. | R3 |
| EXIF strip by default | Upload pipeline strips metadata (including GPS) before storage | R3 |
| Row-level security | Postgres RLS enabled on user-scoped tables — a second authorization wall beneath the application layer | R1, R7 |
| Audit log | Security-relevant events (auth, session revocation, visibility changes, data export, deletion scheduling) recorded with actor and outcome; the operator can detect and reconstruct misuse | R1, R7 |
| Consent registry | Federation publish, AI agent access, newsletter inclusion, search indexing, and aggregate stats each check an explicit per-user consent purpose in code before processing | R1, R4, R9 |
| Federation tombstones + anonymization | Deletion propagates tombstones to peers; locally, federated rows are anonymized (owner nulled, identifying text redacted) rather than left dangling | R4 (reduces, does not eliminate — disclose the residual honestly) |
| DP aggregate minimums | Aggregate statistics enforce a minimum cohort size and **refuse to answer** (`CohortTooSmall`) rather than return a small-cohort result | R9 |
| Zero telemetry, machine-verified | See §3.2 — removes an entire class of third-party leakage | R1, R2 |
| Encrypted backups | restic authenticated encryption at source; storage-credential compromise cannot read snapshots | R5 |
| GDPR substrate coverage audit | Every feature storing user data must register both an exporter and a deletion handler; the audit fails the build otherwise. Rights support cannot silently rot. | R1, R4 |
| 30-day deletion grace + reaper | Deliberate erasure with an undo window, then a sweep that purges via the deletion registry | R5 (bounds retention) |
| Auth hardening | Hashed session tokens, HttpOnly/Secure/SameSite cookies, login lockout, TOTP/WebAuthn support, per-user active-sessions UI | R7 |
| Stripe holds card data | The instance never stores card numbers; subscriber linkage limited to Stripe identifiers | R8 (partially — the subscriber list itself remains sensitive; restrict admin access) |

Operational measures you must supply (the software cannot): disk encryption on the host, OS patching, who has shell/admin access (`{{ADMIN_ACCESS_LIST}}`), and where the restic passphrase and master key are stored offline.

---

## 6. Residual risk and prior consultation (Art. 36)

After mitigation, record what remains: `{{RESIDUAL_RISK_SUMMARY}}`. Honest residuals for this product: federation cache persistence (R4), the operator's own access to Mode A content (R1/R6 — only sealed content is beyond the operator), and backup retention lag (R5).

If you assess any residual risk as **high** and cannot reduce it, Art. 36 requires consulting `{{SUPERVISORY_AUTHORITY}}` before processing. For a hub that follows this template and keeps high-risk content sealed, that outcome would be unusual — but the check is yours to make, not this document's.

---

## 7. Consultation

- **DPO advice** (if appointed): `{{DPO_ADVICE_OR_NA}}`
- **Views of data subjects** (Art. 35(9) — for a coven/order hub this is cheap: ask your members): `{{MEMBER_CONSULTATION_SUMMARY_OR_WHY_NOT_SOUGHT}}`
- **Processors consulted** (hosting, backup, email providers — link their DPAs): `{{PROCESSOR_DPA_LINKS}}`

---

## 8. Sign-off and review

| Role | Name | Decision | Date |
|---|---|---|---|
| Controller / operator | `{{OPERATOR_NAME}}` | Risks accepted / mitigations required: `{{DECISION}}` | `{{DATE}}` |
| DPO (if any) | `{{DPO_NAME}}` | `{{DPO_OPINION}}` | `{{DATE}}` |

Re-run this DPIA when: you enable a subsystem listed in §3.3, you start accepting members from a jurisdiction where practice is criminalized or socially dangerous, you enable payments, the platform adds a new outbound destination (the project documents these), or 12 months pass — whichever comes first.
