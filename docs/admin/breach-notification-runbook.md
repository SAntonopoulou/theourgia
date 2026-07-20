# Breach notification runbook

If personal data on your Theourgia instance may have been exposed, altered, or destroyed by someone or something that should not have — this document walks you through the first 72 hours and out the other side.

It covers: detecting a breach, deciding how bad it is, the GDPR Article 33/34 notification duties, containment steps concrete to this stack, evidence preservation, and a tabletop exercise so you rehearse this before it is real.

**Scope honesty.** On a single-user instance where you are the only data subject, GDPR notification duties very likely do not apply (household exemption) — but the containment and evidence sections still do; run them. On a multi-user hub you are a controller and the clocks below are real. For a large hub or one with payments enabled, get professional advice **now**, not during an incident — a lawyer you have never spoken to cannot help you inside 72 hours.

**Before any incident**, fill these in and keep a printed copy off the server:

| Item | Value |
|---|---|
| Supervisory authority + breach-reporting channel (most have a web form) | `{{AUTHORITY_AND_URL}}` |
| Operator contact for users | `{{CONTACT_EMAIL}}` |
| Where the offline copies of `RESTIC_PASSWORD`, `SECRET_KEY`, `MASTER_ENCRYPTION_KEY` live | `{{OFFLINE_KEY_LOCATION}}` |
| Hosting, DNS, R2/backup, Stripe, email-provider account recovery paths | `{{PROVIDER_ACCOUNT_NOTES}}` |

---

## 1. Detection

Breaches announce themselves through a small number of channels. Check all of them when any one of them fires.

**The audit log.** Security-relevant actions are recorded with actor, action, and outcome. Look for: logins you cannot explain, `user.data_export` events the user did not trigger, bursts of failed auth followed by a success, visibility changes widening content, deletion scheduling nobody requested.

```sql
-- Recent security-kind audit events
SELECT created_at, action, outcome, actor_id, detail
FROM audit_event
WHERE kind IN ('auth', 'security')
ORDER BY created_at DESC LIMIT 200;

-- Sessions from unfamiliar addresses
SELECT user_id, ip_address, user_agent, created_at, expires_at
FROM session ORDER BY created_at DESC LIMIT 100;
```

**Server logs.** Backend application logs and Caddy access logs: unfamiliar admin-route access, scraping patterns against private routes, 500-bursts around auth endpoints. Login lockout events in the backend log are an early credential-stuffing signal.

**Infrastructure signals.** R2/storage access from unknown credentials or regions; restic snapshots appearing, disappearing, or failing `restic check`; hosting-provider alerts; unexpected outbound traffic (this platform makes almost none — see the zero-telemetry posture — so surprise outbound connections are inherently suspicious).

**People.** User reports ("I got a password-reset email I didn't request", "my sealed count changed"), federation peer operators reporting bad signatures or odd deliveries from your instance, and public dump sites. Take user reports seriously immediately — for this product's data, users notice.

**When a signal fires: open an incident note (plain text, timestamped, kept off the affected server) and start writing down everything you do.** Every later section assumes this note exists.

## 2. Triage — how bad is it?

Two questions decide everything downstream: **what data class** was exposed, and **in what state**. Theourgia's encryption model means the same stolen file can be a non-event or a disaster depending on what else was taken.

| What was exposed | State | Severity | Notification posture |
|---|---|---|---|
| Sealed (Mode B) content only | Ciphertext; keys derive from user passphrases the server never had | Low | Art. 34 exception applies (data unintelligible); Art. 33 may still apply — assess residual metadata |
| DB dump / disk image, **without** `MASTER_ENCRYPTION_KEY` | Mode A content is wrapped ciphertext; account rows, session metadata, audit rows are plaintext | Medium | Likely Art. 33 (email addresses, IPs, the fact of membership); Art. 34 depends on what plaintext columns reveal |
| DB dump **with** key material (`.env`, master key) | Mode A content readable: journals, mood/body data, locations | **Critical** | Art. 33 yes; Art. 34 yes — belief data of identifiable people |
| Credentials (password hashes, session tokens, TOTP secrets) | Hashes are slow-hashed / tokens hash-stored, but assume offline attack | High | Art. 33 yes; Art. 34 usually yes (force resets regardless) |
| Backup snapshots + `RESTIC_PASSWORD` together | Equivalent to DB-plus-keys, historical depth | **Critical** | As above |
| Backup snapshots alone (storage creds only) | Ciphertext; restic encrypts at source | Low | Document it; likely no notification duty. Rotate storage creds — the attacker can still **delete** backups |
| Federation private key | Attacker can impersonate your instance to peers | Medium | Not usually a personal-data breach itself; notify peers, revoke, rotate (see §5) |
| Subscriber/payment linkage (publishing hubs) | Legal payment identity tied to occult publications | High | Art. 33 yes; Art. 34 likely — this linkage is exactly the harm your users fear |

Remember the "fact of membership" problem: for this user base, **an email address in this database is itself a disclosure of religious affiliation**. A leak that would be trivial for a forum is not trivial here. Weigh Art. 34 accordingly.

## 3. The 72-hour clock (Article 33)

**What starts it: awareness.** The clock starts when you have a reasonable degree of certainty that a breach of personal data has occurred — not when the intrusion happened, and not when you finish investigating. A short, genuinely diligent investigation window to establish whether a breach occurred is legitimate (EDPB Guidelines 9/2022); logging "signal received at T, confirmed breach at T+n hours because X" in your incident note is what makes it legitimate.

**The duty (Art. 33(1)):** notify `{{SUPERVISORY_AUTHORITY}}` without undue delay and, where feasible, within 72 hours of awareness — **unless** the breach is unlikely to result in a risk to the rights and freedoms of natural persons (e.g. the sealed-only or ciphertext-only rows in the matrix above).

**What the notification contains (Art. 33(3)):** nature of the breach including categories and approximate numbers of data subjects and records; your contact point; likely consequences; measures taken or proposed. Template letter in §7.

**You will not know everything at hour 71. That is fine.** Art. 33(4) explicitly permits notification in phases — send what you know, say what you do not, follow up. An incomplete on-time notification beats a complete late one.

**If you exceed 72 hours**, the notification must be accompanied by the reasons for the delay. Your incident note is that record: when each fact was learned, what containment consumed the time. Write it as you go, not after.

**Whether or not you notify, document (Art. 33(5)).** Every breach — including the ones below the risk threshold — goes in your internal breach register: facts, effects, remedial action, and your risk reasoning. This register is what you show an authority who asks why you did not notify.

## 4. Notifying users (Article 34)

Notify affected data subjects without undue delay when the breach is likely to result in a **high risk** to them. For this product, plaintext exposure of practice content, mood/body history, precise locations, or the membership list of a hub in a hostile environment is high risk almost by definition.

Exceptions (Art. 34(3)): (a) the data was protected by measures rendering it unintelligible — sealed content, Mode A ciphertext without keys, encrypted backups without the passphrase; (b) you have since ensured the high risk can no longer materialize; (c) individual contact would be disproportionate effort, in which case make an equally effective public announcement.

Plain language, no euphemisms, concrete self-protection steps. Template in §7. One product-specific mercy to include when true: **sealed content was not readable** — say so explicitly, your users will be counting on it.

## 5. Containment — concrete to this stack

Order matters: **preserve evidence first (§6), then contain.** Several steps below destroy attacker state that is also your forensic record. Snapshot before you rotate.

Work down this list; skip what the triage says is unaffected.

1. **Cut active access.** If the host itself is compromised, isolate it (hosting-provider firewall, or stop Caddy) before anything else.
2. **Force logout everyone.** Session tokens are hash-stored in the `session` table; deleting rows invalidates them instantly:
   ```sql
   DELETE FROM "session";
   ```
   Every user re-authenticates. For a single suspect user, delete by `user_id` instead (the same mechanism behind the active-sessions UI).
3. **Invalidate outstanding reset tokens:** `DELETE FROM password_reset_token;`
4. **Rotate `SECRET_KEY`** in `.env` and restart the stack.
5. **Force password resets** for affected users if credentials may have leaked. Password hashes are slow-hashed, but treat a leaked hash as a burning fuse, not a wall.
6. **Rotate `MASTER_ENCRYPTION_KEY`** — only if key material may have leaked. Honest warning: **there is still no one-command rotation tool for the master key itself.** The procedure is manual: with the old key still available, unwrap each stored data key and re-wrap under a new master key (the envelope layer in `core/crypto/` is per-item, so this is a scripted sweep over the key table), inside a maintenance window with a fresh backup taken first. If this is beyond your comfort, keeping the instance offline until you get help is a legitimate containment state. **Vault data keys (the DEKs the master wraps) DO have real rotation tooling** as of v1-027: `POST /api/v1/keys/rotate` (or Settings → Keys) creates a fresh DEK and re-encrypts the vault's Mode A content in a background sweep — run it per vault after the master key is re-established to retire possibly-exposed DEKs; see [disaster recovery §8](./disaster-recovery.md). Note: rotating keys protects future reads of the database **at rest**; it does not un-leak content the attacker already decrypted. Sealed (Mode B) content is unaffected throughout — the server never had those keys.
7. **Rotate federation identity** if the federation private key was exposed: delete `/var/lib/theourgia/federation.key` and `.pub`, restart (a fresh keypair generates on first start), then notify peer operators out-of-band, revoke and re-issue capability tokens, and expect ActivityPub followers to re-follow. This is the same procedure as disaster-recovery §7 — identity intentionally cannot be reissued without per-peer trust re-establishment.
8. **Rotate R2 / backup storage credentials** at the provider, update `.env`. Verify recent snapshots still pass `restic check` — an attacker with storage credentials could not read backups, but could have deleted or corrupted them.
9. **Rotate Stripe keys** (restricted API keys, webhook signing secret) if payments are enabled; check the Stripe dashboard for actions you did not take.
10. **Rotate email-provider credentials** if enabled — a mail-capable attacker can phish your own users convincingly.
11. **Patch the entry point.** Containment without closing the hole is theater. If the vector was a Theourgia vulnerability, report it to the project (security contact in the repository) — other instances are exposed too.

## 6. Evidence preservation

Do this **before** the destructive containment steps, and in parallel with the incident note:

- Snapshot the broken state: `docker compose exec postgres pg_dumpall -U theourgia > incident-<date>.sql` and copy backend + Caddy logs off-host.
- Preserve, do not prune: the `session` table contents (IPs, user agents), audit rows, and hosting-provider logs — export before they rotate.
- Record hashes of anything you find on disk that you did not put there.
- Keep everything somewhere the attacker demonstrably is not, retained until the incident and any regulatory interest are fully closed.

## 7. Template letters

### 7.1 To the supervisory authority (Art. 33)

> To: `{{SUPERVISORY_AUTHORITY}}` — data breach notification
>
> **Controller:** `{{OPERATOR_NAME}}`, operating the Theourgia instance at `{{INSTANCE_URL}}`. **Contact:** `{{CONTACT_EMAIL}}`.
>
> **Nature of the breach:** On `{{DATE_AWARE}}` we became aware that `{{WHAT_HAPPENED — e.g. "a copy of the instance database was exfiltrated via X"}}`. The breach occurred on or around `{{DATE_OCCURRED_IF_KNOWN}}`.
>
> **Data and subjects affected:** approximately `{{N_SUBJECTS}}` data subjects and `{{N_RECORDS}}` records, in the categories: `{{CATEGORIES — note explicitly where special-category (religious/philosophical belief) data is involved, and which portions were encrypted and remain unintelligible}}`.
>
> **Likely consequences:** `{{CONSEQUENCES — be honest: involuntary disclosure of religious practice, credential reuse risk, etc.}}`
>
> **Measures taken or proposed:** `{{CONTAINMENT_STEPS_FROM_SECTION_5 + vector remediation + user notification status}}`.
>
> `{{IF_LATE: This notification is made more than 72 hours after awareness because: REASONS.}}`
> `{{IF_PARTIAL: Investigation is ongoing; we will provide information in phases per Art. 33(4). Next update expected DATE.}}`

### 7.2 To affected users (Art. 34)

> Subject: Security incident at `{{INSTANCE_URL}}` — what happened and what to do
>
> On `{{DATE}}`, `{{PLAIN_LANGUAGE_WHAT_HAPPENED}}`. We are writing because your data was affected.
>
> **What was exposed:** `{{SPECIFIC_TO_THIS_USER_GROUP}}`.
> **What was NOT exposed:** `{{E.G. "Content you marked sealed is encrypted with a key that only you hold; it was not readable and remains not readable. Payment card numbers are held by Stripe and were not on this server."}}`
>
> **What we have done:** `{{CONTAINMENT_SUMMARY — e.g. "all sessions were revoked, passwords must be reset, the vulnerability is patched"}}`.
>
> **What you should do:** reset your password at `{{INSTANCE_URL}}/settings/password` (choose one you use nowhere else); if you reused it elsewhere, change it there too; review Settings → active sessions; `{{ANY_SCENARIO_SPECIFIC_STEP}}`.
>
> We are sorry. Questions: `{{CONTACT_EMAIL}}`. You also have the right to lodge a complaint with `{{SUPERVISORY_AUTHORITY}}`.

## 8. Post-incident review

Within two weeks, while memory is fresh: reconstruct the timeline from the incident note; answer (1) how did they get in, (2) why did detection take as long as it did, (3) what data-minimization or sealing would have reduced the blast radius, (4) which runbook steps were wrong or missing — then fix this document. Close the register entry (§3) with the final facts. If the vector was software, confirm the upstream fix landed and your instance runs it.

## 9. Tabletop exercise — rehearse before it is real

Run this once before launch and then annually (pairs well with the disaster-recovery drill cadence). 45 minutes, no production systems touched.

**Roles.** Incident Lead (decides), Scribe (keeps the incident note — this role is the one people skip and regret), Communications (drafts the two letters), and a Facilitator who reveals the injects. **On a solo instance you play all of them; the exercise still works — the point is discovering what you do not know while nothing is burning.**

**Scenario: the leaked DB dump.**

- **T+0 (5 min).** Inject: a user emails you a link — a paste site hosts a file named after your instance; the visible header is a Postgres dump preamble dated three days ago. Facilitator asks: what do you check first, and what starts (or does not start) the Art. 33 clock right now?
- **T+10 (10 min).** Inject: you confirm the file contains your `user`, `session`, and content tables. Your `.env` is not in the paste. Triage using §2: which severity row? Is Mode A content readable? What about sealed? Scribe records the awareness timestamp and reasoning.
- **T+20 (10 min).** Containment: Lead walks §5 aloud, step by step, naming the actual commands and which provider dashboards they would open. Facilitator challenges: "the evidence snapshot — did you take it before you deleted the sessions?" and "where exactly is the offline `RESTIC_PASSWORD` right now?" If anyone has to say "I'd figure it out," that is a finding.
- **T+30 (10 min).** Notification: Communications drafts both §7 letters with real placeholder values. Decide: does Art. 34 apply here? (For a hub: yes — email addresses plus the fact of membership plus any plaintext columns.) Would you notify the authority before you know how the dump was taken? (Yes — phased notification.)
- **T+40 (5 min).** Debrief: each role names one thing that was slower or murkier than expected. Convert every finding into either a runbook edit or a preparation task (fill a missing table row in the header of this document, print the offline keys note, appoint a backup contact).

Findings from a tabletop are bugs. File them.
