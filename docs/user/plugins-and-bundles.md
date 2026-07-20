# Plugins and Bundles

Theourgia extends in two ways. Plugins add capability — a new calendar
system, a new divination method, a new cipher. Bundles carry knowledge —
a pantheon, a ritual set, a correspondence table — packaged so one
magician can share it with another. Both are governed by the same
principle: you see exactly what a thing will do or add before it touches
your vault.

## Installed plugins

At `/plugins`. Each installed plugin has a detail page, a configuration
page, and an activate/deactivate switch; `/plugins/status` shows the
health of everything installed. Deactivating a plugin stops it without
removing it; uninstalling removes it.

### Capability review at install

Plugins do not get free run of your vault. Every plugin declares, in its
manifest, the specific capabilities it needs — and at install time you
review that list, the way a browser shows you what an extension wants,
before anything is granted. A plugin can only ever do what you approved.

## The registry and its three tiers

Browse the plugin registry from `/plugins/registry` (the registry's
public home is at `/registry`). Every listing shows its tier, and the
tier tells you how much scrutiny the code has had:

- **Official** — reviewed by Theourgia maintainers for security, code
  quality, and update-friendliness.
- **Community** — signed releases from known contributors meeting a
  minimum quality bar.
- **Unverified** — user-supplied code with no review. The registry says
  so plainly; install these at your own risk.

Releases are cryptographically signed by their authors and verified on
install. Plugin authors submit through `/registry/submit` and can track
their submissions; maintainers review in a queue and decide tier
promotions. Security advisories have their own submission path at
`/registry/advisory`.

## Sandbox before commit

At `/sandbox`. You never have to try an unfamiliar plugin or bundle
against your real vault. Import it into a sandbox first: an isolated
holding space where you can inspect and evaluate it. Sandbox contents
never federate, never touch your personal content, and never appear in
your searches — the isolation is structural, because nothing is
materialized into your vault until you decide.

From the sandbox you either **promote** — commit the contents into your
main vault, a deliberate and irreversible step — or **discard**. A
sandbox left alone expires on its own after 30 days.

## Bundles — the Magickal Bundle Format

At `/bundles`. A bundle is a single `.mbf` file: a signed, inspectable
package holding a typed payload — entities and their seals, rituals,
decks, correspondences, cipher definitions, festival calendars, and
more — together with a manifest declaring its name, version, author,
license, source citations, and lineage. Because it is an ordinary ZIP
of JSON inside, you can open one with stock tools and read exactly what
it contains before importing anything.

### Import preview and piecemeal selection

Importing starts with a preview: the bundle's manifest, a listing of
every item inside, the signature verdict, and the license and
attribution block — plus any conflicts with what you already have (a
same-named entity, for instance, which follows the alias-graph model
and is never destructively merged).

You then choose what to take. Import is piecemeal by design: one ritual
out of a tradition bundle, three entities out of a pantheon — you are
never forced to swallow a bundle whole.

### Attribution and provenance

A bundle's attribution is surfaced prominently at import and persists
with the imported content; there is no way to strip it. When a bundle
derives from another, the provenance chain records every step, and the
chain is append-only — a derived work can add its link but can never
shorten or rewrite the history.

Signed bundles are verified against the author's key. An unsigned
bundle is not blocked, but the import says so, visibly.

### Closed traditions

Some knowledge is not the sharer's to spread. A bundle can declare
itself closed-tradition — belonging to a living tradition that does not
consent to public redistribution. When you import one:

- A **respect-source notice** is shown, explaining the declaration.
- The imported content is tagged so that public sharing of it is
  blocked, and AI agents (if you use them) can never read it.
- The public registry refuses closed-tradition bundles at submission.

You keep full personal use of what you imported; the flag governs
redistribution, not your own practice.

### Current status

The bundle backend is live: preview, piecemeal import, the installed
list, export, and the sandbox path all run against real endpoints, and
`/bundles` shows your actual install records. Seven bundled content
packages ship with Theourgia — a Hellenic pantheon, a Thelemic ritual
set, classic tarot spreads, a further PGM voces selection, Agrippa's
planetary correspondences, traditional incense recipes, and
traditional dream symbols — each a real `.mbf` built from cited
public-domain sources. Two of the seven (the correspondences and the
dream symbols) carry payload kinds that have no importer yet: their
items are listed and kept with the install record, and the import
report says plainly that they were not materialized. Removing an
installed bundle is not wired yet — the surface tells you so rather
than pretending.
