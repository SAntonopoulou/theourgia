# Getting started

This guide covers your first hour with a fresh vault: the first-run
wizard, choosing your magickal name, signing in, protecting the account
with a password, and finding your way around the application shell.

## The first-run wizard

When a vault has never been opened — no account exists yet — visiting
the application takes you to `/setup`, a short five-step welcome:

1. **Welcome.** A brief orientation. Nothing here is irreversible.
2. **Your magickal name.** The name every entry, rite, and attestation
   is signed with — not your legal identity. See below.
3. **Traditions.** Which traditions inform your practice (Hellenic,
   Thelemic, Hermetic, Goetic, Vedic, Norse, Egyptian, Kabbalah, Chaos,
   Witchcraft, Christian, Other). Pick as many as apply; this is a
   nudge for the interface, not a lock.
4. **Calendars.** Which calendar systems you would like displayed.
5. **Review.** Confirm your choices and select **Open the vault**. This
   creates your account and signs you in.

Encryption preferences, two-step verification, and library imports are
not part of the wizard — you can set those up afterwards from the
settings pages, whenever you are ready.

If the vault already has an account, `/setup` sends you to the sign-in
page instead.

## Your magickal name

Theourgia is built around pseudonymity. The name you choose in the
wizard is the identity your vault presents: it appears in the
navigation, on anything you publish, and on cryptographic attestations.
Your legal name is never required anywhere in the product.

## Signing in

Sign in at `/signin` with your magickal name. Two things to know:

- **Set a password.** A fresh account created through the wizard has no
  password yet, which means the magickal name alone opens the vault.
  Go to `/settings/password` and set one (minimum eight characters) as
  soon as you are signed in — the settings page shows a clear notice
  until you do. Once a password is set, sign-in requires it.
- **Passkeys work too.** If you have enrolled a passkey (a
  hardware key or your device's built-in authenticator) at
  `/settings/webauthn`, the sign-in page offers **Sign in with
  passkey**. You can also enroll an authenticator app for two-step
  verification at `/settings/totp`. Both are covered in
  [Settings and security](settings-and-security.md).

Some vaults are run as single-operator instances: the operator
configures an allowlist of accepted magickal names, and any other name
is refused at sign-in.

## A tour of the shell

Once signed in, every page renders inside the same frame: a top bar, a
left navigation column, and the working surface.

### The top bar

The top bar shows the current page title and an identity switcher on
the right. The switcher shows the identity you are acting as and offers
**Manage identities** and **Sign out**.

### The navigation

The left column groups the vault into sections. The gear at the bottom
opens Settings.

- **Practice** — *Today* (`/`), your almanac and ledger for the day;
  *Journal* (`/journal`); *Daily practice* (`/daily-practice`);
  *Practice log* (`/practice-logs`).
- **Reference** — *Entities* (`/entities`), *Library* (`/library`),
  *Calendar* (`/calendar`).
- **Workbench** — *Divination* (`/divination/tarot`), *Sigil Generator*
  (`/sigils`), *Magic Squares* (`/magic-squares`), *Talisman Designer*
  (`/talismans`), *Magical Circle* (`/circles`), *Tool Registry*
  (`/tools`), *Voces Magicae* (`/voces`).
- **Linguistic** — *Gematria* (`/gematria`), *Transliteration*
  (`/transliterations`), *Voces library* (`/voces-library`).
- **Synchronicity & study** — *Synchronicities* (`/synchronicities`),
  *Analytics* (`/analytics`).
- **Publishing** — *Publications* (`/publications`), *Subscribers*
  (`/subscribers`).
- **Media** — *Media library* (`/media`), *Audio library* (`/audio`),
  *Pilgrimage map* (`/pilgrimage`), *Calendar feed* (`/icalfeed`).
- **Network** — *Ritual feed* (`/feed`), *My networks* (`/networks`),
  *Followers* (`/followers`), *Private viewers* (`/private-viewers`).
- **Platform** — *Plugins* (`/plugins`), *Bundles* (`/bundles`),
  *Sandbox* (`/sandbox`).

### The Today page

The home page (`/`) is a working almanac: the current planetary hour
and the full table of the day's hours, the lunar phase, transits, an
"on this day" lookback, and ledger cards summarising what is due —
recurring offerings coming up within twenty-four hours, overdue
contract obligations and oath checkpoints (sealed checkpoints show a
count only, never text), and servitors whose feeding cadence has
elapsed. A quick-capture field lets you jot an entry without leaving
the page.

### Quick capture

`/capture` is a deliberately minimal full-screen surface: one text
field and a Save button, designed to be useful in five seconds. If you
install the vault as an app on your phone, this is the screen the icon
opens. It works offline — captures queue on your device and sync the
next time you open it with a connection.

## Where to next

Most magicians start with the [Journal](journal.md), then wire up
[Calendars and the sky](calendars-and-sky.md) and the
[Daily practice tracker](practice.md).
