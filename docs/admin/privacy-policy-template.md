# Privacy policy template for self-hosters

If you run a Theourgia instance that anyone besides you uses, you should publish a privacy policy. This is a fill-in template that is accurate about what the platform actually does — every claim in it maps to a shipped feature, and the awkward truths (federation caches, backup retention lag) are stated rather than smoothed over. Your users are practitioners trusting you with their practice record; a policy that is honest about limits is part of earning that.

**How to use it:**

1. Find-and-replace every `{{PLACEHOLDER}}` (list below).
2. Delete the sections marked *(delete if not enabled)* for subsystems you do not run — a policy that describes processing you do not do is its own kind of dishonest.
3. Read the whole thing once as if you were your most at-risk user.
4. Publish it at a stable URL on your instance and link it from signup.

**When to get professional review instead of just shipping this:** a hub with many members, paid publishing enabled, members in jurisdictions where practice is dangerous, or any processing you have added beyond stock Theourgia. For a personal instance or a small hub of consenting adults, this template is designed to be usable as-is.

| Placeholder | What goes there |
|---|---|
| `{{OPERATOR_NAME}}` | You, or your organization (the controller) |
| `{{INSTANCE_URL}}` | e.g. `https://vault.example.org` |
| `{{CONTACT_EMAIL}}` | Where users reach you about privacy |
| `{{JURISDICTION}}` | Where you (the controller) are established |
| `{{SUPERVISORY_AUTHORITY}}` | Your data protection authority + link |
| `{{HOSTING_PROVIDER_AND_REGION}}` | e.g. "Hetzner, Falkenstein DE" |
| `{{BACKUP_PROVIDER_AND_REGION}}` | e.g. "Cloudflare R2, EU jurisdiction setting" |
| `{{BACKUP_RETENTION}}` | Your restic snapshot retention, e.g. "90 days" |
| `{{LOG_RETENTION}}` | Access/audit log retention, e.g. "30 days / 12 months" |
| `{{EMAIL_PROVIDER}}` | If email is enabled |
| `{{EFFECTIVE_DATE}}` | Date of this policy version |

---
---

# Privacy policy — `{{INSTANCE_URL}}`

**Effective:** `{{EFFECTIVE_DATE}}` · **Operator (data controller):** `{{OPERATOR_NAME}}`, `{{JURISDICTION}}` · **Contact:** `{{CONTACT_EMAIL}}`

This instance runs [Theourgia](https://github.com/SAntonopoulou/theourgia), open-source (AGPLv3) software for keeping a magickal practice record. This policy explains what data this instance holds about you, why, who else can ever see it, and how you exercise your rights. It is written to be read, not skimmed.

## The short version

Your vault is yours. Everything you write is private by default. Nothing leaves this server except at your explicit instruction. There is no analytics, no tracking, and no advertising — the software is built so that even we cannot quietly add them. Content you mark **sealed** is encrypted in your browser with a passphrase only you hold; we cannot read it even if we wanted to, and neither can anyone who steals our database.

## 1. What data we hold

**Account data.** Your email address, password (stored only as a slow hash) or passkey credential, optional two-factor secret, your magickal name and personas. You never have to tell us your legal name.

**Your practice record.** Journal entries, rituals, divinations, sigils, entity records, oaths, media you upload, and everything else you create here. Be aware of what this is: under data protection law, records of religious or philosophical belief are **special-category data** with the strongest protections, and we treat your entire practice record that way. Mood and body snapshots in the practice tracker are treated with the same care, as health-adjacent data. Pilgrimage sites are location data — see §6 for how precision is limited by design.

**Technical data.** For security we keep: your active sessions (a hashed token, plus the browser identifier and IP address shown to you in Settings under active sessions), an audit log of security-relevant events (logins, password changes, exports, deletions), an email delivery log *(delete if email disabled)*, and standard web-server access logs.

**Payment data** *(delete if publishing/payments not enabled)*. If you subscribe to a paid publication here, payment is processed by Stripe. Card numbers never touch this server; we hold only Stripe's customer and subscription identifiers and your subscription status.

## 2. Why we process it (lawful bases)

| Processing | Legal basis |
|---|---|
| Operating your account and storing what you create | Contract (GDPR Art. 6(1)(b)) |
| Your practice record (special-category content) | Your explicit consent, given at signup (Art. 9(2)(a)). Withdrawing it means deleting the content or the account, which you can do yourself at any time. |
| Security logging (sessions, audit log, lockouts) | Our legitimate interest in keeping your vault secure (Art. 6(1)(f)) |
| Federation, newsletters, AI features, search-engine visibility | Your consent, per feature, off by default (Art. 6(1)(a)); the software checks your consent in code before each of these ever runs |
| Payments *(delete if not enabled)* | Contract, plus legal obligations around payment records (held by Stripe) |

We do not do profiling, automated decision-making, or advertising, and we never sell or share data for anyone's marketing. There is no lawful-basis row for those because the processing does not exist.

## 3. Visibility: you control who sees each item

Every item has a visibility level you set: **personal** (only you — the default for everything), **viewer** (people you explicitly grant), **network** (federated instances you connect with, only if you have enabled federation consent), **public**, or **sealed**. **Sealed** is stronger than private: it is encrypted in your browser before upload, the server stores only ciphertext, and no operator, attacker, or court order directed at us can decrypt it — only your passphrase can. Sealed items appear in any shared context as a count, never as content. There is no mechanism to unseal from the server side; if you lose the passphrase, we cannot recover the content either. That trade-off is deliberate.

## 4. Who ever receives your data

**Nobody, by default.** The following recipients exist only for features you or we have explicitly turned on:

- **Federated peer instances** *(delete if federation disabled)*: if you grant federation consent and set an item's visibility to network or public, copies are delivered to peer instances. **Honest limit:** those copies then sit on servers run by other people under their own control. If you later delete the content, this instance sends deletion notices (tombstones) to peers and scrubs your identity from the local federated record — but we cannot technically force another operator to comply. Do not federate what you may need to un-say.
- **Stripe** *(delete if payments disabled)*: payment processing, as its own controller.
- **`{{EMAIL_PROVIDER}}`** *(delete if email disabled)*: delivers password resets and, only if you subscribed with double opt-in, newsletters.
- **`{{BACKUP_PROVIDER_AND_REGION}}`**: stores our backups, which are encrypted before they leave this server; the provider holds ciphertext it cannot read.
- **Anthropic** *(delete if AI agent disabled)*: only if you personally opt in to the AI assistant, and only the content you allow it to read, per invocation. No opt-in, no data flow.
- **Public search engines**: your public content is *not* made discoverable to search engines unless you opt in — many practitioners prefer quiet, so the default is quiet.

If we are ever legally compelled to disclose data, we can only disclose what we can read: sealed content is beyond us, structurally.

## 5. Where your data lives (international transfers)

This instance runs on `{{HOSTING_PROVIDER_AND_REGION}}`. Encrypted backups are stored with `{{BACKUP_PROVIDER_AND_REGION}}` — check and state your bucket's jurisdiction setting; if the backup or hosting region is outside the EEA, name the transfer mechanism here (e.g. adequacy decision, SCCs, or the provider's Data Processing Addendum): `{{TRANSFER_MECHANISM_OR_"not applicable — all storage in the EEA"}}`.

## 6. Built-in data minimization

Worth stating because it is unusual: **zero telemetry** — this software sends no usage data, analytics, or "anonymous" statistics to anyone, ever, and ships an automated check that fails the software's own build if that changes. Photos have identifying metadata (EXIF, including GPS) stripped on upload by default. Locations you save are stored only at the precision you choose, coarsened before storage, and can only ever be made *less* precise afterwards — the fine coordinates are irreversibly discarded, so they cannot leak later. Any aggregate statistics (only if enabled, only with your consent) refuse to compute over groups small enough to identify anyone.

## 7. How long we keep things

- **Your content:** until you delete it.
- **Your account:** until you delete it. Deletion has a **30-day grace period** — you can change your mind with one click during those 30 days; after that, an automated process permanently erases your data. Content you had federated or published into shared spaces is scrubbed of your identity rather than silently vanished from other people's records, and deletion notices go to federation peers (§4).
- **Backups:** deleted data can persist inside encrypted backup snapshots until those snapshots expire — at most `{{BACKUP_RETENTION}}` after deletion. Backups are never used to resurrect deleted accounts.
- **Sessions** expire automatically and can be revoked by you at any time in Settings. **Logs:** `{{LOG_RETENTION}}`.

## 8. Your rights, and the button for each one

You do not have to email us to exercise your rights — the software implements them directly:

| Right | How to exercise it |
|---|---|
| Access + portability (Art. 15, 20) | Settings → Data export — one click produces a complete machine-readable archive of everything this instance holds for you, assembled from every feature (API: `POST /api/v1/me/data-export`) |
| Rectification (Art. 16) | Edit anything you created, directly |
| Erasure (Art. 17) | Delete individual items directly, or Settings → Delete account for everything (API: `POST /api/v1/me/account/delete`; 30-day grace, then permanent; reactivate via one click or `POST /api/v1/me/account/reactivate`) — subject to the honest federation and backup limits in §4 and §7 |
| Withdraw consent (Art. 7(3)) | Each optional feature (federation, newsletter, AI, search visibility) has its own toggle in Settings; turning it off stops that processing going forward |
| Restriction / objection (Art. 18, 21) | Email `{{CONTACT_EMAIL}}` — with visibility controls and per-feature consent this rarely comes up, but the right is yours |
| Complain | You can always lodge a complaint with `{{SUPERVISORY_AUTHORITY}}` |

Anything the in-product tools do not cover: `{{CONTACT_EMAIL}}`. We respond within one month, as the law requires.

## 9. Cookies

One. A first-party session cookie (`theourgia_session`) that keeps you logged in — HttpOnly, Secure, and strictly essential, which is why no cookie banner interrogates you. No third-party cookies, no tracking pixels, no fingerprinting.

## 10. Security

Content is encrypted at rest; sealed content is additionally end-to-end encrypted (§3). Access control is enforced in the application and again at the database layer. Passwords are slow-hashed; two-factor and passkeys are supported and recommended. Backups are encrypted before leaving the server. Security-relevant actions are audit-logged. If a breach ever affects you, we will tell you what happened, what was and was not readable, and what to do — plainly and promptly, as the law and basic decency require.

## 11. Changes

We will announce material changes on the instance and update the effective date. We will never retroactively weaken what this policy promises about content you already stored; if a change would, we will ask, not tell.

---
---

## Localization note (for the operator — not part of the published policy)

The GDPR text above travels well. For the major nearby regimes, the substance survives and mostly the names change:

- **UK GDPR:** replace `{{SUPERVISORY_AUTHORITY}}` with the ICO (ico.org.uk), cite "UK GDPR" instead of "GDPR". Article numbering is identical; the 72-hour breach rule and the rights table need no changes. If you serve both UK and EU users from one instance, name both authorities.
- **Swiss FADP (revised 2023):** authority is the FDPIC. The FADP has no special-category consent article numbered 9(2)(a), but religious and philosophical data *is* sensitive data ("besonders schützenswerte Personendaten") requiring express consent — the practice described above already meets it. Breach notification is "as soon as possible" for high-risk breaches rather than a fixed 72 hours. Swap the article references or simply drop the article numbers.

Checklist before publishing any variant: (1) correct authority name and complaint link; (2) correct legal-instrument name in the intro and rights table; (3) transfer section reflects where *your* servers and backups actually are relative to the user base's jurisdiction; (4) if you enabled payments, confirm Stripe's terms for your country; (5) response deadline (one month under GDPR/UK; "without delay" under FADP). Jurisdictions further afield (US state laws, etc.) are beyond a find-and-replace — get advice there.
