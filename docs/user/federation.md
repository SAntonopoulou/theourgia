# Federation and Networks

Federation lets vaults connect: to working groups and orders (hubs), to
trusted individual readers, to shared rituals across distance, and — if
you choose — to the wider fediverse. It is magical infrastructure, not
social media, and the design enforces the difference.

## What federation is not

Three commitments are built into the chrome, not just promised:

- **No engagement metrics.** No follower-count on your dashboard, no
  "you reached X followers" notifications, no posting streaks or badges.
  The follower count exists in one quiet place — the followers list —
  and nowhere else.
- **No recommendation algorithm.** Every feed is chronological. There is
  no "trending," no "popular this week," no "suggested for you."
- **Not a walled garden.** Nothing in the network features locks you to
  an instance or hub; exporting everything you own is always available.

And one commitment above the rest: **sharing is consent-first.** Nothing
leaves your vault without a deliberate choice, content by content.

## Hubs

A hub is a first-class group — a lodge, an order, a study circle — with
a name, description, tradition tags, and members. Your hubs live at
`/networks`; browse peer instances at `/networks/peers` and discover
hubs at `/networks/discover`. Each hub has a member dashboard, and a hub
can present a public face to non-members at `/hub/{slug}`.

### Roles and administration

Members hold one of five roles: admin, officer, moderator, member, or
observer. What each role may do is a capability matrix the hub's admins
can edit; the hub's owner is always an admin and cannot be demoted.
Every administrative action — role changes, member management, content
moderation — lands in the hub's audit log, visible to hub admins.

## Private viewers

At `/private-viewers`. For a student, a partner, or a working-group
colleague, you can issue a personal reading credential without them
needing an account. The credential is shown to you exactly once at
creation — it is never stored or displayed again — and it is scoped:
by default a grant covers a tag's worth of content, never your whole
vault. Revoking a credential is immediate and permanent.

## Group rituals

Schedule a shared working at `/group-rituals/new`, run it at
`/group-rituals/{id}/run`, and reflect on it afterwards at
`/group-rituals/{id}`.

A ritual is drafted, participants are invited and respond, the organizer
starts it, and while it runs each participant can append fragments —
observations that are append-only, never edited or deleted. Afterwards,
each participant may write one reflection, once. When the organizer
closes the ritual, the record is complete and stays as it was.

### Across timezones

A group ritual happens at one fixed moment, wherever the participants
are. You set the time in your local clock and the others follow — and
the display is always three-pinned: your local time, universal time
(UTC), and your local planetary hour at that moment. Scheduled group
rituals also appear in the ritual feed at `/feed`.

## Single sign-on

Theourgia SSO lets you carry one identity across networks. Authorizing
an SSO assertion is an explicit consent moment; every assertion expires
after 24 hours (the server fixes this — no longer window can be
requested), and you can review and revoke your assertions at any time.

## ActivityPub — the fediverse bridge

At `/settings/activitypub`. Your vault can speak ActivityPub, so people
on Mastodon and other fediverse software can follow it. This is
**off by default** and entirely opt-in.

The cardinal rule: **only content you have marked public ever
federates.** Personal, viewer-scoped, network-scoped, and sealed content
never flows through ActivityPub, under any setting.

Follower requests require your manual approval by default — review and
approve or decline them at `/followers`, and a decision is final. Your
public content maps onto standard fediverse types (entries and
publications as articles, notes as notes, rituals as events), so it
degrades gracefully in ordinary clients. Broadcasting deletions to
followers is its own opt-in, with the honest caveat that remote servers
may keep cached copies regardless. You can check how your vault's
identity resolves across the fediverse at `/verify`.

## Current status

The federation transport — the machinery that actually moves messages
between instances — is gated by the instance operator: it stays off
until whoever runs your Theourgia instance enables it in the server
configuration. Every surface described above exists in your vault now;
cross-instance traffic begins when your operator turns the transport on
and, for ActivityPub, when you opt in.
