# ADR-0010: Conventional Commits + Semantic Versioning

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #process, #releases, #automation

## Context and problem statement

We need a commit-message convention and a versioning scheme. The choice affects:

- Whether release notes can be auto-generated from commits
- Whether semantic-release-style tooling can determine version bumps automatically
- How readable the project's history is
- How easy it is for contributors to understand expectations

Without a convention, the commit history becomes noisy and changelog generation requires manual archaeology.

## Decision drivers

- Auto-generated release notes from commits (low friction at release time)
- Predictable version bumps (PATCH for fixes, MINOR for features, MAJOR for breaks)
- Readable history (one line tells you what changed)
- Tooling support (commitlint, conventional-changelog, etc.)
- Lightweight enough that contributors adopt it naturally

## Considered options

1. **Conventional Commits + SemVer** — structured commit prefixes (`feat:`, `fix:`, etc.), versions follow `MAJOR.MINOR.PATCH`
2. **Free-form commits + SemVer** — let humans write whatever; pick version bumps manually
3. **GitHub auto-generated release notes** without commit conventions — easier upfront, less power
4. **CalVer** (calendar versioning, e.g., `2026.06.20`) — for projects whose pace is more about time than features

## Decision

- **Conventional Commits 1.0** for commit messages
- **Semantic Versioning 2.0** for releases

## Rationale

Conventional Commits is the dominant standard for projects of our size and shape. It's simple enough to learn in 30 seconds (`type(scope): subject`), well-supported by tooling, and produces history that humans and machines can both read.

SemVer is what users of self-hosted software expect: a major version bump means "read the upgrade notes," a minor means "new things to discover," a patch means "safe to upgrade without thinking."

CalVer (option 4) suits projects whose pace is steady and time-driven (Ubuntu, etc.). Theourgia's pace is feature-driven; SemVer is more informative.

Free-form commits (option 2) sounds liberating until you try to write a changelog for a six-month period; the cost just compounds.

GitHub's auto-release-notes (option 3) is a good fallback for projects without commit conventions, but it generates lower-quality notes than tools that parse Conventional Commits properly.

## Consequences

### Positive
- `commitlint` and `conventional-pre-commit` enforce the format at commit time (already wired in via [.pre-commit-config.yaml](../../.pre-commit-config.yaml))
- Tooling can auto-generate the CHANGELOG section for a release
- `feat:` → MINOR, `fix:` → PATCH, `feat!:` / `BREAKING CHANGE:` → MAJOR — version bumps are mechanical
- One-line `type(scope): subject` is readable in `git log --oneline`

### Negative / trade-offs
- Contributors need to learn the convention (one cheat-sheet to read once)
- Occasional friction when a commit doesn't fit a single type cleanly — convention says split the commit

### Neutral
- Pre-1.0 versions (`0.x.y`) per SemVer allow breaking changes in MINOR bumps. We honor this — pre-1.0 is for breaking changes that need to ship before stability is promised. Once we tag `v1.0.0`, MAJOR bumps cost the user effort and we hold them to a higher standard.

## Implementation notes

### Commit format

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer(s)>
```

**Types we use:**
- `feat` — a new user-visible feature
- `fix` — a user-visible bug fix
- `docs` — documentation only
- `style` — formatting / whitespace (no logic change)
- `refactor` — internal change with no user-visible effect
- `perf` — performance improvement
- `test` — adding or fixing tests
- `build` — build system / deps
- `ci` — CI/CD config
- `chore` — housekeeping that doesn't fit other types
- `revert` — reverts a previous commit

**Breaking changes:**
- `feat!:` or `fix!:` (note the `!`) signals breaking
- Body includes `BREAKING CHANGE: <description>`

**Examples:**
```
feat(journal): add scrying log entry kind with trance mode UI

feat!: replace pyswisseph 2.x with pyswisseph 3.x API

BREAKING CHANGE: chart data now uses ISO 8601 timestamps instead of Julian Day numbers
```

### Version bumps

- `fix` → PATCH bump (0.1.0 → 0.1.1)
- `feat` → MINOR bump (0.1.0 → 0.2.0)
- `feat!` or `BREAKING CHANGE:` → MAJOR bump (0.x → 0.y or 1.x → 2.x)
- Other types (`docs`, `chore`, etc.) → no bump alone, but they may be released as part of a PATCH

### Enforcement

- Pre-commit hook (`conventional-pre-commit`) validates the message at commit time
- CI re-validates on push
- PR reviews check that commit messages tell the story

### CHANGELOG

- Maintained in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format at [CHANGELOG.md](../../CHANGELOG.md)
- Entries grouped under release headers
- Pre-1.0 entries live under `## [Unreleased]` and are squashed into a release section when a tag is cut

## References

- [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0](https://semver.org/spec/v2.0.0.html)
- [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/)
- [.pre-commit-config.yaml](../../.pre-commit-config.yaml) — commitlint hook
- [CHANGELOG.md](../../CHANGELOG.md)
