# Handover — the site now shows only what the phone shows

**15 August 2026.** For whoever works on theourgia next.

Two changes landed, both small and both reversible. The larger thing is what
they are *for*, which is a programme that has barely started.

---

## What Sophia asked for

> *"There are features on theourgia that are not yet finished. We need to hide
> these from the menu to only show the same features that we have available on
> the app … Pretty much I'm asking you to hide all the features except those
> specific ones that I mentioned above from the theourgia site until they are
> totally finished and to bring the site in line with the mobile application —
> **the mobile application being the source of truth**."*

And, separately:

> *"we do need voces to be added from the app and synced to the web and vice
> versa etc. This should be capable of running both ways for all the features."*

⚠ **"The app" is `practiseapp`** — the Flutter app whose pubspec name is
`theourgia`, at `~/Documents/development/practiseapp`. It is not astropractise,
which is a different product that happens to share this host.

---

## Change 1 — the nav is gated

`frontend/shared/src/PracticeNav/PracticeNav.tsx` gained
`HIDDEN_UNTIL_FINISHED`: a flat set of nav keys that are not rendered.

**24 of 36 entries are hidden.** The 12 that remain are the ones the phone has
a counterpart for:

> Today · Journal · Daily rite · Practice log · Calendar · Divination ·
> Astragaloi · Magic squares · Voces magicae · Gematria · Transliteration ·
> Voces library

⚠ **Unhiding is deleting one line.** The trees — `PRACTICE_WING_SECTIONS` and
`PLATFORM_WING_SECTIONS` — are untouched and still hold all 36. Nothing was
removed, so nothing has to be reconstructed; when a feature is finished, take
its key out of the set and it comes back where it always was.

⚠ **This hides the MENU, not the route.** Every page still exists and still
answers to anyone who types its URL. If something needs to be genuinely
unreachable, that is a router change and nobody has asked for one.

⚠ **The whole platform wing is empty**, so the wing switcher is gone —
`HAS_PLATFORM_WING`. A button that crosses to a blank page reads as a page that
failed to load. It returns by itself the moment anything in that wing is
unhidden. A stored `theourgia.nav.wing = "platform"` from before the gate no
longer strands anyone, and there is a test for that.

### The tests moved with it

`PracticeNav.test.tsx` used to assert "all 17 practice links" and "all 14
platform links" by hand. Those numbers were the gate's job to decide, so the
tests now derive from `VISIBLE_PRACTICE_SECTIONS` and will not go stale when
you unhide something. Added: that hidden labels are absent, that the trees are
intact, and that a gated key like `awaitingjudgment` still renders the nav
without throwing for somebody who arrives by URL.

⚠ One test changed meaning rather than shape: the awaiting-judgment **count
chip** hangs off a link that is now hidden, so a queue with work in it is
silent. The chip returns with the link.

## Change 2 — one capture chip withdrawn

`frontend/admin/src/routes/Today.tsx` offered four captures: synchronicity,
dream, sensation, working. `OFFERED_CAPTURES` now omits **synchronicity**,
because `/synchronicities` is gated — a chip that files something where
nothing can read it back is worse than no chip. The entry was really written
and the person who wrote it had no way to find it again.

---

## ⚠ What is NOT done, and it is the large part

**Nothing syncs, and nothing can yet.** `practiseapp` has **no networking of
any kind**: its entire dependency list is drift, sweph, geolocator, audio,
notifications, timezone. No `http`, no accounts, no tokens, no API client.
Everything lives in a local drift database on the device.

So "sync both ways for all the features" is not wiring up something dormant.
It needs, roughly in this order:

1. **Accounts in the app** — it has no notion of one. Sign-in, token storage,
   and an offline-tolerant client, because the app must keep working with no
   server at all. `astropractise/lib/data/api/api_client.dart` is a worked
   example of that shape and is worth reading first.
2. **One thing end to end, to prove the protocol** — the record is the right
   candidate, being the thing Sophia named. Conflict handling is the real
   design problem: the same day can be edited on the phone and on the site.
3. **Then the rest**, on the protocol that survived step 2.

### Two model facts that will shape it

⚠ **Correspondences run the other way from what you would guess.** The PHONE
has the richer model — `practiseapp/lib/domain/spiritual_map.dart`, where a
correspondence attaches to whatever *carries* it: a node, an edge, a line, a
shape, or a group, deliberately not to nodes alone. This site has no
correspondences model at all; the word appears only scattered inside entities,
tarot and I Ching. This is "give the site what the app already has".

⚠ **The record is not the journal, and Sophia said so explicitly**: *"the
record needs to be added pretty much separate from the journal."* The site's
journal is entries with a type and a visibility. The phone's record is a timed
ledger of practice — keepings, notes carrying a **Mood** and a **Body** reading
on five-point scales, and **conditions** captured at the moment: sign, ruler,
sect, retrograde, aspect, moon phase, house, house system, weather, feeling,
place, nakshatra. Flattening that into journal entries would lose the part that
makes it a record.

⚠ **Voces magicae exists here and not on the phone** — `/voces`,
`/voces-library`, `backend/theourgia/api/routers/v1/voces.py`. That one really
is "add it to the app", and Sophia wants it syncing both ways once it is there.

### Email is decided, and mostly already here

Sophia, 15 August: **Resend**, sending as **contact@theourgia.com**, shared
across all three products. theourgia.com is on her Proton account.

⚠ This backend already has the whole thing — `core/email/` is a backend
protocol with console, null, smtp, resend, postmark, ses and mailgun behind
`THEOURGIA_EMAIL_BACKEND`. So here it is **configuration**, not building:

```sh
THEOURGIA_EMAIL_BACKEND=resend
THEOURGIA_EMAIL_DEFAULT_FROM=contact@theourgia.com
THEOURGIA_RESEND_API_KEY=…
```

⚠ Those go in the compose `environment:` map for the backend service, **not
only in `.env`** — this stack takes an explicit map, so a variable added to
`.env` alone reaches nothing. That trap cost a restart on 15 August with
`THEOURGIA_LINK_CODE_CLIENTS`; the fix is in `docker-compose.yml` beside it.

astropractise has no email code at all and should copy this shape rather than
invent a second one.

### The quick links are still not matched

Sophia asked for the homepage quick links to match the phone's. They cannot
honestly be matched yet: the phone's are *keep a practice* and *a note with a
Mood and a Body reading*, and this site has nowhere to put either until the
record model exists. Relabelling the capture chips now would write entries in a
shape that has to be migrated later. Withdrawing the synchronicity chip is the
only part that stands on its own.

---

## Where the parity list came from

The phone offers **8 practices** — lunar adorations, solar adorations, rituals,
workings, meditation, pranayama, divination, letters and numbers
(`practiseapp/lib/domain/practice.dart`) — and **6 utilities**: the record,
calendar, elections, spiritual map, charts, planetary hours
(`practiseapp/lib/features/shell/app_shell.dart`).

⚠ **Parity cuts both ways.** Four of those utilities have no page here at all —
**elections, the spiritual map, charts, planetary hours**. They are not hidden;
they are missing, and they are the gaps in the other direction.
