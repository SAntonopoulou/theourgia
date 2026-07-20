# Settings, Security, and Your Data

Your vault holds things that are nobody else's business. This page
covers how you lock it (password, two-factor codes, passkeys, sessions),
how encryption works in plain terms, the accessibility preferences, and
your rights over your own data — export, deletion, and the audit trail.
Settings live under `/settings`, with each area on its own page.

## Password

At `/settings/password`. Once a password is set, signing in requires it
— set one as soon as your vault exists. Passwords must be at least eight
characters, and changing your password requires the current one first.
If your vault has no password yet, the settings page shows a gentle
banner reminding you.

## Two-factor codes (TOTP)

At `/settings/totp`. Add an authenticator app — FreeOTP, Aegis, Authy,
Google Authenticator, 1Password, or any other standard TOTP app — as a
second factor:

1. Begin enrollment; the vault shows a QR code to scan.
2. Enter a code from the app to confirm. Enrollment completes and you
   receive **ten backup codes, shown once** — store them somewhere safe
   and offline; they are your way in if you lose the phone.

You can regenerate the backup codes later (which revokes the old set)
or disable TOTP entirely. The secret is revealed only at enrollment and
never shown again.

## Passkeys (WebAuthn)

At `/settings/webauthn`. A passkey lets your device — a security key,
your phone, your laptop's fingerprint reader — prove it is you, without
typing anything. After you enroll one, signing in is discoverable: no
username field, no password; your authenticator offers the credential
and you approve. Passkeys and TOTP can coexist; either serves as an
independent proof of identity.

## Sessions and devices

At `/settings/sessions`. Every signed-in session is listed in plain
device language — "this laptop, Athens, last seen 14 minutes ago" — not
as opaque token strings, which are never displayed. You can sign out
any single session, or sign out everything except the one you are
using now.

## Encryption, explained for humans

Theourgia has two encryption modes, and understanding the difference
matters more than the algorithm names.

### Mode A — the server protects your data at rest

Ordinary vault content is encrypted on disk with keys belonging to your
vault (AES-256-GCM). The server can decrypt it — that is what lets it
show you your journal, search it, and back it up. Mode A protects you
against stolen disks and leaked backups, not against the server itself.

Mode A keys can be rotated at `/settings/keys`: a current-key card, a
step-by-step rotation wizard, and a history of retired keys. Rotation
is also the remedy when a key may have been exposed — the new key
takes over immediately, a background sweep re-encrypts your existing
content, and the old key moves to your trusted history. Retired keys
are kept (never deleted) so nothing you wrote ever becomes unreadable.

### Mode B — sealed, and only you hold the key

Sealed content — sealed entries, oaths, initiations, sealed talismans —
is different. Your browser derives an encryption key from your
passphrase (PBKDF2, 600,000 iterations) and encrypts the content with
AES-256-GCM **before it leaves your device**. The server receives and
stores only ciphertext. Reading sealed content prompts for the
passphrase and decrypts in memory, on your device.

**The warnings, plainly:**

- There is no "forgot passphrase" for sealed content. The server cannot
  reset what it cannot read.
- If the passphrase is lost, the sealed content is lost. Permanently.
  No operator, developer, or executor can recover it.
- This is the point of the seal — the same property that makes it
  trustworthy makes it unforgiving. Choose a passphrase you will not
  lose, and consider where (or whether) to keep a copy.

## Accessibility and motion

At `/settings/accessibility`. Preferences for how the vault behaves for
your body and attention: reduced motion, increased contrast, larger
text, and whether audio may autoplay. There is also an optional
crisis-aware nudge — off by default — which, if you enable it, can
gently surface non-magickal support resources when your logged body and
mood snapshots show sustained severe distress. These preferences are
stored on your device.

Location for astrological calculations (your latitude and longitude,
used for planetary hours and chart stamps) is set under
`/settings/preferences`.

## Your data: export and deletion

Both flows are self-service — no email to support, no waiting on a
human.

### Export everything

At `/settings/data-export`. One action produces a structured export of
everything the vault holds about you, in readable JSON. It is your
data; taking all of it with you is always available.

### Delete your account

At `/settings/delete-account`. Deletion is scheduled with a **30-day
grace period**: for thirty days the account is marked for deletion but
nothing is destroyed, and reactivating is a single tap on the same
page. After the window passes, your data is purged.

## The audit log

At `/settings/audit`. An append-only record of every event you are the
actor of — sign-ins, security changes, and the rest — filterable by
action, event kind, and time range, and exportable as CSV when you want
a forensic copy. Nothing can be deleted from it, including by you; that
is what makes it worth reading.

## Zero telemetry

Theourgia sends no analytics, no usage statistics, no crash reports —
nothing — to anyone. The software's only outbound connections are ones
your own actions cause (fetching a video you embedded, talking to your
own Stripe account, an agent run you started with your own key). This
is a design commitment of the project, not a toggle.
