# Future feature — Daily practice tracker

> **Must-do** per maintainer directive (2026-06-21). A self-designed-ritual
> companion to the Liber Resh dashboard. Same affordances (next-due,
> did-I-do-it-today, streak, multi-anchor day), but the *content* of each
> practice is defined by the user — a candle to a household deity, a
> banishing on waking, a meditation sit, a daily divination pull,
> whatever the practitioner already does.

## Why

Liber Resh covers exactly one observance pattern (Thelemic
four-times-a-day adoration). Almost every practitioner has their own
daily / weekly observances that deserve the same companion treatment.
The Resh dashboard primitives that the designer is returning in
handoff 01 are precisely the building blocks needed — they should be
reused, not re-implemented.

## Design dependency

A `Daily Practice.dc.html` from the designer is required before any
frontend work. It should:

- Reuse the Resh dashboard visual language for the per-practice cards.
- Add an authoring surface (create / edit a practice) that takes:
  - title, glyph, cadence (daily / weekly / lunar / per-festival / cron),
  - preferred anchor times (free-form local-time list or named anchors),
  - optional liturgy / instructions (rich text),
  - optional tradition tag, optional entity binding,
  - which Entry kind the check-in produces (`ritual_log` /
    `body_practice` / `note`).
- A "today" surface showing all practices for the current day with
  fast check-in.

The maintainer ("Soror Ευ. Α.") owns the visible copy; the placeholder
"Daily Practice" title is provisional. **Per
`feedback_wellbeing_copy_never_improvise.md`, no language is
finalised without maintainer input** — copy is queued for review on
arrival.

## Backend (single batch, roughly Batch 50)

- `DailyPractice` model: title, glyph, cadence, anchor_times (JSON),
  liturgy (text), entry_kind_for_checkin (enum), tradition tag,
  entity_id (nullable), visibility (mirrors EntryVisibility), owner_id.
- Reminders ride the same Celery beat scaffolding as
  `RecurringOffering` and the Liber Resh anchors
  (`core/tasks/scheduler.py`).
- Check-in API: `POST /api/v1/daily-practices/{id}/check-in` →
  creates an Entry of the configured kind, attached to the practice
  via a foreign key on Entry (no parallel ledger).
- Streak / completion stats are derived at read time from Entry rows;
  not persisted.

## Frontend (after backend + designer)

- Reuse the Resh dashboard primitives from
  `frontend/admin/src/routes/liber-resh.tsx`.
- Parameterise the per-anchor card with the practice definition.
- Add an authoring route.

## Don't

- No gamification: no XP, badges, "levels", "you're on a streak 🔥".
  Same tone discipline as Servitors — matter-of-fact ledger.
- Don't fork the Entry pipeline. Daily-practice check-ins ARE entries.
- Don't bake in tradition-specific assumptions at the schema layer.

## Ordering

After Phase 06 (Divination & Practice) wraps. Phase 06 ships the
deterministic *Cast(seed) engines; Daily Practice sits on top of the
journal + scheduling substrate already in place.

This file is a placeholder — the implementation plan with a Batch
number is written when the corresponding designer file arrives.
