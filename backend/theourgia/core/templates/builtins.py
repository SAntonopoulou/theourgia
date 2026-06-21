"""Built-in entry templates.

The 12 templates documented in `plan/04-journaling.md` §3. Each
template's ``body_template`` is a Tiptap-JSON document — the editor
parses it on load and renders prompt-placeholder paragraphs as
ghosted text the practitioner overwrites.

The shape of each Tiptap doc here is the minimal-viable scaffold;
the designer's `.dc.html` for the editor will set the typography +
spacing once that surface lands (see designer_handoff_01.handoff).
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.entries import EntryType
from theourgia.models.templates import EntryTemplate, TemplateScope

__all__ = [
    "BUILTIN_TEMPLATES",
    "BuiltinTemplate",
    "builtin_by_id",
    "seed_builtin_templates",
]


def _doc(*paragraphs: str) -> str:
    """Serialise a list of prompt paragraphs as Tiptap JSON."""
    return json.dumps({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "attrs": {"placeholder": p},
                "content": [],
            }
            for p in paragraphs
        ],
    })


@dataclass(frozen=True, slots=True)
class BuiltinTemplate:
    """One built-in template's serialised form."""

    builtin_id: str  # stable kebab-case
    name: str
    description: str
    kind: EntryType
    body_template: str
    default_title_pattern: str
    default_glyph: str
    tradition: str | None


BUILTIN_TEMPLATES: tuple[BuiltinTemplate, ...] = (
    BuiltinTemplate(
        builtin_id="magical-record",
        name="Magical Record (Crowley)",
        description=(
            "A structured magical-record entry following the Crowleyan "
            "convention from *Liber E vel Exercitiorum*: date / time / "
            "location, breath count, posture, mantra, results, "
            "observations."
        ),
        kind=EntryType.MAGICAL_RECORD,
        body_template=_doc(
            "Date and time of the working.",
            "Location and conditions of the temple.",
            "Posture / asana used.",
            "Pranayama / breath count.",
            "Mantra or formula employed.",
            "Subjective results.",
            "Objective observations.",
        ),
        default_title_pattern="Record — {date}",
        default_glyph="ritual",
        tradition="thelemic",
    ),
    BuiltinTemplate(
        builtin_id="ritual-log",
        name="Ritual Log",
        description=(
            "Open-tradition log of a ritual working: intent, preparation, "
            "performance, results."
        ),
        kind=EntryType.RITUAL_LOG,
        body_template=_doc(
            "Intent / purpose of the ritual.",
            "Preparation — cleansing, banishing, materials.",
            "Description of the rite itself.",
            "What did you observe during?",
            "Result and reflection.",
        ),
        default_title_pattern="Ritual — {date}",
        default_glyph="ritual",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="dream",
        name="Dream",
        description=(
            "Dream record: the dream itself, then a separate reflection "
            "block for waking interpretation."
        ),
        kind=EntryType.DREAM,
        body_template=_doc(
            "What happened in the dream — write quickly, before forgetting.",
            "Recurring symbols or characters.",
            "How did you feel during the dream?",
            "Reflection on waking.",
        ),
        default_title_pattern="Dream — {date}",
        default_glyph="moon",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="divination",
        name="Divination",
        description=(
            "General divination entry: question, system used, result, "
            "interpretation."
        ),
        kind=EntryType.DIVINATION,
        body_template=_doc(
            "Your question (precise; the answer is in the question).",
            "Divination system used (tarot, I Ching, runes, geomancy, …).",
            "The cast / draw / reading itself.",
            "Interpretation.",
            "Action steps from the reading.",
        ),
        default_title_pattern="Reading — {date}",
        default_glyph="divination",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="synchronicity",
        name="Synchronicity",
        description=(
            "Note a meaningful coincidence: the event, the inner state, "
            "the meaning you assign."
        ),
        kind=EntryType.SYNCHRONICITY,
        body_template=_doc(
            "Describe what happened.",
            "What were you thinking or working on?",
            "Why does this matter to you?",
        ),
        default_title_pattern="Synchronicity — {date}",
        default_glyph="star",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="liber-resh",
        name="Liber Resh adoration",
        description=(
            "Daily solar adoration record — Crowley's *Liber Resh vel "
            "Helios*. Marks the transition + a one-line reflection."
        ),
        kind=EntryType.LIBER_RESH,
        body_template=_doc(
            "Which transition (sunrise / noon / sunset / midnight)?",
            "Adoration performed in full? Partial? Skipped?",
            "One sentence on the quality of attention.",
        ),
        default_title_pattern="Resh — {transition} {date}",
        default_glyph="sun",
        tradition="thelemic",
    ),
    BuiltinTemplate(
        builtin_id="banishing",
        name="Banishing",
        description=(
            "A banishing record: form used (LBRP / Star Ruby / Heptagram "
            "/ etc.), conditions, energetic result."
        ),
        kind=EntryType.RITUAL_LOG,
        body_template=_doc(
            "Banishing formula used.",
            "Time + place.",
            "Felt sense before.",
            "Felt sense after.",
            "Was the space clear?",
        ),
        default_title_pattern="Banishing — {date}",
        default_glyph="shield",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="invocation",
        name="Invocation",
        description=(
            "An invocation record: the entity invoked, the form, the "
            "result. Cross-tradition skeleton."
        ),
        kind=EntryType.WORKING,
        body_template=_doc(
            "Entity / power invoked.",
            "Form of invocation used.",
            "Preparation + conditions.",
            "What was felt / seen / heard.",
            "Charge / commission given (if any).",
            "Banishing performed at close?",
        ),
        default_title_pattern="Invocation — {entity} — {date}",
        default_glyph="ritual",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="scrying",
        name="Scrying",
        description=(
            "Skrying record: the medium (mirror, crystal, water, fire, "
            "sigil), the question, the imagery, the interpretation."
        ),
        kind=EntryType.SCRYING,
        body_template=_doc(
            "Medium scryed (mirror, crystal, water, sigil, …).",
            "Sphere / sephira / entity target (if any).",
            "Question or focus.",
            "Imagery, sensations, voice — what came up.",
            "Interpretation.",
        ),
        default_title_pattern="Scrying — {date}",
        default_glyph="eye",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="tarot-reading",
        name="Tarot Reading",
        description=(
            "Tarot reading record: spread + cards drawn + reading."
        ),
        kind=EntryType.DIVINATION,
        body_template=_doc(
            "Question.",
            "Spread used (Celtic Cross, three-card, custom).",
            "Cards drawn (position : card : reversed?).",
            "Reading.",
            "Felt sense.",
        ),
        default_title_pattern="Tarot — {date}",
        default_glyph="divination",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="pathworking",
        name="Pathworking",
        description=(
            "Pathworking record (Tree of Life or other system): the "
            "path / sephira, the imagery, the gnosis."
        ),
        kind=EntryType.PATHWORKING,
        body_template=_doc(
            "Path / sephira / sphere worked.",
            "Entry imagery (gate, doorway, scene).",
            "What was encountered along the path.",
            "Entity met, if any.",
            "Gnosis received.",
            "Return imagery.",
        ),
        default_title_pattern="Pathworking — {path} — {date}",
        default_glyph="compass",
        tradition=None,
    ),
    BuiltinTemplate(
        builtin_id="astrology-reading",
        name="Astrology Reading",
        description=(
            "Astrology session record: chart cast, key placements, "
            "interpretation, action."
        ),
        kind=EntryType.DIVINATION,
        body_template=_doc(
            "Chart cast (natal, horary, electional, transit).",
            "Date / time / location for the chart.",
            "Key placements observed.",
            "Aspects of note.",
            "Interpretation.",
            "Action arising.",
        ),
        default_title_pattern="Astrology — {date}",
        default_glyph="star",
        tradition=None,
    ),
)


def builtin_by_id(builtin_id: str) -> BuiltinTemplate:
    """Look up a built-in by stable id. Raises ``KeyError`` if missing."""
    for t in BUILTIN_TEMPLATES:
        if t.builtin_id == builtin_id:
            return t
    raise KeyError(f"No built-in template with id {builtin_id!r}")


async def seed_builtin_templates(session: AsyncSession) -> int:
    """Seed the database with the built-in templates.

    Idempotent: skips templates that already exist (matched by
    ``name`` + ``owner_id IS NULL`` since built-ins have no owner).
    Returns the count of templates inserted (0 if all were already
    present).
    """
    existing_stmt = select(EntryTemplate).where(
        EntryTemplate.owner_id.is_(None),
    )
    existing = (await session.execute(existing_stmt)).scalars().all()
    existing_names = {t.name for t in existing}

    inserted = 0
    for tmpl in BUILTIN_TEMPLATES:
        if tmpl.name in existing_names:
            continue
        row = EntryTemplate(
            name=tmpl.name,
            description=tmpl.description,
            kind=tmpl.kind,
            scope=TemplateScope.PUBLISHABLE,
            body_template=tmpl.body_template,
            default_title_pattern=tmpl.default_title_pattern,
            default_glyph=tmpl.default_glyph,
            owner_id=None,
            tradition=tmpl.tradition,
            license="AGPL-3.0-only",
        )
        session.add(row)
        inserted += 1

    if inserted:
        await session.commit()
    return inserted
