# Synchronicity and Analytics

This is the Scientific Illuminism side of the vault: record what
happens, then ask honest questions about it. The tools here are built to
show you patterns without ever telling you what the patterns mean —
that judgement stays yours.

## Synchronicity log

At `/synchronicities`. A synchronicity entry records the event, when it
happened, and the context around it. On save, the vault auto-tags each
entry with the current astrological and calendar context; tags added by
the machine are marked as automatic, and anything you set yourself is
marked as manual, so you always know which is which. If an entry's
context goes stale you can re-run the auto-tagging.

Location on a synchronicity honors your precision floor: the vault never
stores coordinates finer than the precision you have chosen, no matter
what the device reported.

The log includes a quick-capture composer for getting the event down in
seconds — the details can come later. (The vault's general quick-capture
page at `/capture` also works offline and syncs when you are back on the
network.)

## Query builder

At `/query`. Build chained filter expressions over your journal, your
workings, and your synchronicities — combine conditions with and/or
logic, nest groups, and run the result. A useful query can be saved as a
study (see the Linguistic Tools guide for how studies freeze their
results into snapshots).

When a query touches the text of your entries, sealed entries are
excluded from the scan — and the result tells you how many sealed
entries were excluded, so an absence in the results is never silent.

## Analytics dashboard

At `/analytics`. Four views over your recorded practice:

- **Time series** — counts bucketed over time.
- **Heatmap** — a two-dimensional grid, for example weekday against
  planetary hour.
- **Correlation** — Pearson and Spearman coefficients between two
  measures.
- **Today** — the hero counts for the current day.

### Small samples are flagged

Every aggregate response carries its sample size, and anything computed
from too few data points is flagged as a small sample. Correlation in
particular refuses to pretend: below a minimum sample size it will not
report a coefficient as if it were meaningful. Treat flagged numbers as
invitations to gather more data, not as findings.

## Weekly digest

Once a week the vault assembles a digest of statistically interesting
recurrences in your data. Each item shows what was measured, over what
period, and with what sample size. Items can be dismissed; the
underlying results are immutable history.

### The banned-phrase rule

Digest headlines are checked, before they are ever written, against a
list of banned phrasing. The digest will never tell you something
"must" or "will" happen, never call a result "guaranteed" or
"definitely," never reach for "destiny" or "fated," never claim the
gods favor anything, and never say a factor "clearly favors" an
outcome. If a headline template were ever to slip into that register,
the vault refuses to save it. The digest reports recurrences; it does
not deliver oracles. Your divination tools are for oracles.

## Aggregates across magicians: the differential-privacy story

A long-standing goal is opt-in aggregate analytics across a network of
practitioners — "how does this pattern look across the hub?" — without
any individual's data being exposed.

The mathematical substrate for this is already in the vault: aggregates
are protected with differential privacy, meaning calibrated random noise
is added to every count, sum, and mean, and a query is refused outright
if the cohort is too small to hide an individual in. Every noisy result
carries its privacy budget (epsilon), cohort size, and noise scale, so
you can judge how much to trust it.

What does not exist yet is the sharing itself: there are no endpoints
that move your data toward any cross-vault aggregate today. Those arrive
with the federation phases, opt-in, and nothing is shared unless you
choose to contribute.
