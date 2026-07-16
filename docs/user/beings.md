# Beings

The beings ledger records the other side of your practice: the
deities, spirits, ancestors, and constructed servitors you work with,
and everything owed and offered between you. Every offering, contract,
and oath attaches to a specific being, so the history of a
relationship is always retrievable.

## Entities

The Entities page (`/entities`) is a card grid of every being in your
vault, filterable by class, with an **Add entity** action. An entity
records its name, kind, tradition tags, and notes. Kinds cover the
breadth of practice: god, goddess, deity, spirit, daemon, angel, demon,
saint, ancestor, beloved dead, familiar, servitor, egregore, principle,
place, object, and other.

Each entity also carries a relationship status — open (in the ledger
for study, not yet contacted), active, dormant, severed, contracted, or
observing — so the grid reads as a map of where things stand.

## The alias graph

Names are slippery: the Hekate of the Chaldean Oracles, the Hekate of a
modern devotional bundle, and your own working Hekate may or may not be
"the same". Theourgia never merges entities destructively. Instead you
link them with typed alias edges: *same-as*, *aspect-of*,
*aspect-includes*, *syncretic-with*, and *epithet-of*.

On top of the graph you can define named unified views (for example
"Hekate-all") that aggregate offering history and records across the
linked entities. Crucially, the underlying records never move: a given
offering was made to a specific entity, and that write-time intent is
preserved forever. The unified view is a reading lens, not a merge.

## Offerings

The offerings ledger records what you gave, to whom, when, with what
intention — and what came back. Each offering carries its items, your
intention, and the reception you perceived on a five-step scale: none,
faint, clear, strong, or overwhelming.

Recurring offerings put a cadence behind a devotion ("Hekate's Deipnon,
monthly"). Anything due within the next twenty-four hours appears on
the Today page's ledger cards.

## Contracts

A contract records a pact with a being as structured data rather than
buried prose: the terms, the obligations on *both* sides (each with its
own status — pending, in progress, fulfilled, overdue, or waived), the
binding kind (verbal, written, blood, breath, item-bound, name-bound,
or other), and the contract's overall state (draft, active, fulfilled,
expired, dissolved, or breached). Obligations can be marked fulfilled
one at a time, and overdue obligations surface on the Today page —
in a calm amber, never an alarm.

## Oaths — sealed by default

The oath ledger records vows by kind — to yourself, a tradition, an
order, a deity, a partner, a community, or other — with status
tracking (active, fulfilled, broken, renounced, lapsed) and
accountability checkpoints.

Oaths default to **sealed**: zero-knowledge encrypted, unreadable by
the server. When a sealed oath has checkpoints due, the Today page
shows only a count — "N sealed checkpoints due" — and never a word of
the text.

## Initiations — sealed only

Initiation records — tradition, grade, when and where received — are
sealed as a rule, not an option. The interface hard-prevents
publishing them. What happened in the temple stays encrypted.

## Servitors and egregores

Servitors get a lifecycle, not just a note: a record is a servitor or
an egregore, with a status of active, dormant, retired, or
decommissioned. Each servitor carries a feeding cadence with a
dedicated action for recording a feeding, plus a task list where each
task moves through pending, in progress, completed, or abandoned.
Servitors whose feeding cadence has elapsed appear on the Today page —
phrased as "record feeding when ready", informational rather than
nagging.

## Ancestors and the family tree

Ancestors and the beloved dead are entities like any other, with
per-ancestor profile details. The Family tree page (`/family-tree`)
lays your ancestor entities out in generational lanes using kinship
edges — *parent-of*, *sibling-of*, and *spouse-of* — which you can add
and remove from the same surface. The page states its own rule
plainly: ancestors and beloved dead are private, never uploaded. There
is deliberately no integration with genealogy services.

## Lineage and attestations

The Lineage page (`/lineage`) manages attestations — claims about
initiation, granted grades, membership, teacher-student relationships,
ordination, or authorship. An attestation starts as self-declared. An
authority (for example a lodge master) can **counter-sign** it with an
Ed25519 cryptographic signature, and anyone shown the attestation can
verify that signature against the authority's public key. Each
attestation displays its state honestly: verified, self-declared, or
revoked. There is no central registry — trust is built peer to peer.

Attestations have their own visibility levels (private, viewer,
network, public), so a lineage can be verifiable without being
broadcast.
