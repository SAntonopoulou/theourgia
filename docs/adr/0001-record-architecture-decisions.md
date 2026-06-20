# ADR-0001: Record architecture decisions

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #process, #governance, #documentation

## Context and problem statement

Theourgia is a large, multi-phase, multi-tradition project intended to outlive any single contributor's involvement and to be picked up cold by future maintainers and contributors. Architectural decisions made along the way will accumulate quietly in code unless we capture them deliberately.

Two failure modes loom if we don't capture decisions:

1. **Tribal knowledge loss.** Future-us (or new contributors) will not know *why* something is the way it is; they will either change it incorrectly or be too afraid to touch it.
2. **Drift between intention and reality.** As the codebase grows, contributors will gradually forget the reasoning behind earlier choices and may introduce inconsistencies.

## Decision drivers

- The project's documentation discipline ("docs detailed enough to resume cold") requires decisions to be recorded, not lived only in conversation.
- The project is open source and expects outside contributors; ADRs make the architectural rationale legible to anyone.
- A long planning phase produces many small decisions that deserve durable capture before code begins to lock them in.

## Considered options

1. **No formal record** — rely on PR descriptions, commit messages, and code comments.
2. **MADR-style ADRs** in `docs/adr/` — short, structured, one-decision-per-file, never edited after acceptance.
3. **A single "design notes" document** — append decisions to one growing file.
4. **External RFC repository** — separate repo for design discussions.

## Decision

We use **MADR-style ADRs**, one per file, in `docs/adr/`.

## Rationale

MADR (Markdown Any Decision Records) is a small, well-defined, widely-used template that captures the *minimum useful structure* without becoming bureaucratic. One-decision-per-file makes ADRs greppable, linkable, and easy to supersede later. Living in the repo (`docs/adr/`) means ADRs version alongside the code they describe.

Option 1 (no formal record) is what most projects do, and it consistently produces the "why is this here?" tax we are trying to avoid.

Option 3 (single document) becomes a wall of text and is hard to supersede cleanly.

Option 4 (external RFC repo) is overkill for a small project and decouples decisions from the code they govern.

## Consequences

### Positive
- Decisions and their reasoning are durable, linkable, and discoverable by future contributors.
- Superseding an old decision produces a new ADR rather than mutating an old one, preserving the historical record.
- Reading the `docs/adr/` directory chronologically tells the project's architectural story.

### Negative / trade-offs
- Small overhead: non-trivial decisions require writing an ADR.
- Risk that ADRs become formality theater if not actually written when needed.

### Neutral
- Style and template enforced via [docs/adr/template.md](template.md); contributors copy and fill in.

## Implementation notes

- ADR filename pattern: `NNNN-kebab-case-title.md`, numbered sequentially.
- ADRs are **never edited after acceptance**. To change a decision, write a new ADR with `supersedes: ADR-####` in the front matter and mark the old one `superseded by ADR-####`.
- The status of an ADR moves: `proposed` → `accepted` → (optionally) `superseded by ADR-####` or `deprecated`.
- Link ADRs from code comments and plan documents where the decision is enacted.

## References

- [MADR — Markdown Any Decision Records](https://adr.github.io/madr/)
- [docs/adr/template.md](template.md) — the project's local ADR template
- [docs/adr/README.md](README.md) — index and conventions
