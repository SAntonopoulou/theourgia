"""The seven bundled content packages — Tier 2 #14 (v1-020).

Real ``.mbf`` containers built at runtime from this data module (no
binary zips are checked in). Each bundle is public-domain diligenced:

- ``hellenic-pantheon`` — the twelve Olympians + Hekate. Facts and
  epithets from Hesiod's *Theogony* and the *Homeric Hymns* (both
  antiquity-PD; Evelyn-White's 1914 translation is PD); the Theoi
  Project is cited as the reference compilation. All phrasings are
  the project's own (CC0-1.0).
- ``thelemic-ritual-set`` — Liber Resh vel Helios (first published
  *The Equinox* I(6), 1911), the Star Ruby as printed in *The Book of
  Lies* (1913) ch. 25, and the "Will" meal saying as printed in
  *Moonchild* ch. VI (Mandrake Press, 1929). The 1911/1913 texts are
  pre-1928 PD everywhere; *Moonchild* (1929) is US-PD since 2025
  (95-year term) and UK/EU-PD since 2018 (Crowley d. 1947, life+70).
  The common modern "Will" wording with the 3-5-3 knock derives from
  *Magick Without Tears* (1954), which is NOT reliably PD — that
  version is deliberately excluded; the Moonchild text ships instead.
- ``classic-tarot-spreads`` — position layouts are uncopyrightable
  systems; the Celtic Cross follows Waite, *The Pictorial Key to the
  Tarot* (1911, PD). All position meanings are the project's own
  concise phrasings (CC0-1.0).
- ``pgm-voces-selection`` — twelve voces from the Greek Magical
  Papyri, each with its PGM reference, chosen to NOT duplicate the
  32-entry bundled corpus in
  :mod:`theourgia.core.workshop.bundled_voces` (a regression test
  enforces this). Candidates whose exact letters or line references
  could not be verified (the ιαεω-palindrome, ΕΥΛΑΜΩ, the Harpon
  Knouphi formula) were excluded on PD-diligence grounds.
- ``planetary-correspondences`` — the classical seven-planet table
  per Agrippa, *De Occulta Philosophia* (1533, PD): metals + stones
  from the Scale of Seven (Book II ch. 10), fume classes from Book I
  ch. 44, colours from Book I ch. 49. Payload kind
  ``correspondences`` has no v1 importer — it imports
  opaque-but-listed, and the manifest description says so honestly.
- ``traditional-incense-recipes`` — six documented historical
  formulas: kyphi per Plutarch (*De Iside et Osiride* §80) and per
  Dioscorides (*De Materia Medica* I.25), the Exodus 30:34 temple
  incense, two Orphic Hymn fumigation rubrics, and the seven
  planetary fumes of PGM XIII.11-20. Ingredient lists are documented
  facts; working steps are the project's own phrasings and say so
  where the source gives none.
- ``dream-symbols-traditional`` — forty symbols with traditional
  meanings in the project's own words, citing Artemidorus'
  *Oneirocritica* (2nd c. CE, PD) or the folk tradition each meaning
  compiles. Payload kind ``dream-symbols`` is opaque-but-listed in
  v1; the manifest description says so honestly.

None of these draw on closed traditions: ``closed_tradition`` is
false on all seven.

Licensing: where a bundle carries verbatim PD text the SPDX is
``LicenseRef-Public-Domain``; where the payload is the project's own
phrasing of traditional/factual material the compilation is dedicated
CC0-1.0. Every bundle carries the ``public-domain`` magickal tag.
"""

# The Greek in this module is real Greek (voces magicae, Star Ruby
# godnames) — not latin-lookalike confusables.
# ruff: noqa: RUF001

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cache
from typing import Any

from theourgia.core.bundles.container import build_mbf
from theourgia.core.bundles.manifest import MBF_VERSION, PayloadDocument

__all__ = [
    "BUNDLED_AUTHOR_NAME",
    "BUNDLED_CONTENT",
    "BUNDLED_CREATED_AT",
    "BundledContent",
    "build_bundled_mbf",
    "bundled_by_slug",
]


BUNDLED_AUTHOR_NAME = "Theourgia Project"
BUNDLED_CREATED_AT = "2026-07-16T00:00:00Z"
"""Fixed creation stamp so container builds are deterministic."""


@dataclass(frozen=True, slots=True)
class BundledContent:
    """One bundled package: manifest fields + payload documents."""

    slug: str
    name: str
    type: str
    version: str
    description: str
    license_spdx: str
    source_citations: tuple[dict[str, Any], ...]
    payloads: tuple[PayloadDocument, ...]

    def manifest_base(self) -> dict[str, Any]:
        """The manifest sans payload/asset entries (``build_mbf``
        fills those)."""
        return {
            "mbf_version": MBF_VERSION,
            "type": self.type,
            "name": self.name,
            "slug": self.slug,
            "version": self.version,
            "description": self.description,
            "author": {"name": BUNDLED_AUTHOR_NAME},
            "license": {
                "spdx": self.license_spdx,
                "magickal_tags": ["public-domain"],
            },
            "source_citations": [dict(c) for c in self.source_citations],
            "closed_tradition": False,
            "created_at": BUNDLED_CREATED_AT,
        }

    @property
    def item_count(self) -> int:
        return sum(len(doc.items) for doc in self.payloads)


# ── 1 · hellenic-pantheon ──────────────────────────────────────────


def _entity(
    ref: str,
    name: str,
    kind: str,
    epithets: list[str],
    summary: str,
    description: str,
    attributions: dict[str, Any],
    citation: str,
) -> dict[str, Any]:
    return {
        "ref": ref,
        "name": name,
        "kind": kind,
        "epithets": epithets,
        "summary": summary,
        "description": description,
        "tradition": "Hellenic",
        "tradition_tags": ["Hellenic"],
        "attributions": attributions,
        "source_citation": citation,
    }


_HELLENIC_ENTITIES: list[dict[str, Any]] = [
    _entity(
        "zeus", "Zeus", "god",
        ["Olympios", "Xenios", "Keraunios", "Panhellenios"],
        "King of the Olympian gods; lord of sky, thunder, law, and "
        "the guest-bond.",
        "Son of Kronos and Rhea, who overthrew the Titans and divided "
        "the cosmos with his brothers, taking the sky. Wielder of the "
        "thunderbolt, guarantor of oaths and of hospitality.",
        {
            "planet": "Jupiter — the Greeks named the planet the "
            "'star of Zeus' (aster Dios)",
            "day": "Thursday (dies Iovis), in the Greco-Roman "
            "planetary week",
            "symbols": ["thunderbolt", "eagle", "oak"],
            "domains": ["sky", "thunder", "law", "hospitality"],
        },
        "Hesiod, Theogony 453-506, 881-885; Homeric Hymn 23 to Zeus.",
    ),
    _entity(
        "hera", "Hera", "goddess",
        ["Teleia", "Argeia", "Boopis"],
        "Queen of the Olympians; goddess of marriage and the "
        "fulfilled bond.",
        "Daughter of Kronos and Rhea, wife and sister of Zeus. Her "
        "great sanctuaries stood at Argos and Samos; brides invoked "
        "her as Teleia, the accomplisher of marriage.",
        {
            "symbols": ["diadem", "cuckoo", "cow"],
            "domains": ["marriage", "queenship", "women's rites"],
        },
        "Hesiod, Theogony 921-929; Homeric Hymn 12 to Hera.",
    ),
    _entity(
        "poseidon", "Poseidon", "god",
        ["Ennosigaios", "Hippios", "Asphaleios"],
        "God of the sea, of earthquakes, and of horses.",
        "Brother of Zeus who took the sea as his portion. The "
        "Earth-shaker, invoked as Asphaleios ('the securer') to hold "
        "the ground steady, and as Hippios, tamer and giver of "
        "horses.",
        {
            "symbols": ["trident", "horse", "bull", "dolphin"],
            "domains": ["sea", "earthquakes", "horses"],
        },
        "Hesiod, Theogony 453-457; Homeric Hymn 22 to Poseidon.",
    ),
    _entity(
        "demeter", "Demeter", "goddess",
        ["Thesmophoros", "Chloe", "Anesidora"],
        "Goddess of grain and the cultivated earth; mother of "
        "Persephone; mistress of the Eleusinian Mysteries.",
        "Her grief and her joy at the loss and return of Persephone "
        "pattern the agricultural year. At Eleusis she gave the "
        "Mysteries — 'happy is he among mortals who has seen these "
        "things.'",
        {
            "symbols": ["sheaf of wheat", "torch", "poppy"],
            "domains": ["grain", "agriculture", "the Mysteries"],
        },
        "Homeric Hymn 2 to Demeter; Hesiod, Theogony 912-914.",
    ),
    _entity(
        "athena", "Athena", "goddess",
        ["Pallas", "Glaukopis", "Polias", "Ergane"],
        "Goddess of wisdom, craft, and disciplined war; keeper of "
        "the city.",
        "Sprung armed from the head of Zeus. Grey-eyed patroness of "
        "weavers, builders, and strategists; her olive and her owl "
        "marked Athens as her own.",
        {
            "symbols": ["owl", "olive tree", "aegis"],
            "domains": ["wisdom", "craft", "strategy", "the city"],
        },
        "Hesiod, Theogony 886-900; Homeric Hymns 11 and 28 to Athena.",
    ),
    _entity(
        "apollo", "Apollo", "god",
        ["Phoibos", "Pythios", "Loxias", "Paian", "Mousagetes"],
        "God of prophecy, music, healing, and the far-shot arrow; "
        "lord of Delphi.",
        "Twin of Artemis, born on Delos. His oracle at Delphi spoke "
        "for Zeus; as Paian he heals, as Mousagetes he leads the "
        "Muses, as Loxias he answers obliquely.",
        {
            "planet": "Sun — by the Hellenistic identification of "
            "Apollo with Helios; not Homeric",
            "day": "Sunday (dies Solis), under the same "
            "identification",
            "symbols": ["lyre", "laurel", "raven"],
            "domains": ["prophecy", "music", "healing", "archery"],
        },
        "Homeric Hymn 3 to Apollo; Hesiod, Theogony 918-920.",
    ),
    _entity(
        "artemis", "Artemis", "goddess",
        ["Potnia Theron", "Agrotera", "Phosphoros", "Kynthia"],
        "Goddess of the wild, the hunt, and the protection of the "
        "young.",
        "Twin of Apollo, mistress of animals, ranging the mountains "
        "with her nymphs. Women in childbirth called on her; her "
        "arrows brought both protection and swift death.",
        {
            "planet": "Moon — by the Hellenistic identification of "
            "Artemis with Selene; not Homeric",
            "day": "Monday (dies Lunae), under the same "
            "identification",
            "symbols": ["bow", "deer", "cypress"],
            "domains": ["the wild", "the hunt", "childbirth"],
        },
        "Homeric Hymns 9 and 27 to Artemis; Hesiod, Theogony 918-920.",
    ),
    _entity(
        "ares", "Ares", "god",
        ["Enyalios", "Brotoloigos"],
        "God of war in its fury and press.",
        "Son of Zeus and Hera, embodying battle's tumult where "
        "Athena embodies its craft. The late Homeric Hymn to Ares "
        "already addresses him as the planet turning 'fiery-bright "
        "among the seven paths.'",
        {
            "planet": "Mars — the 'star of Ares' (aster Areos); the "
            "Homeric Hymn 8 addresses the planet directly",
            "day": "Tuesday (dies Martis)",
            "symbols": ["spear", "helm", "dog", "vulture"],
            "domains": ["war", "courage", "fury"],
        },
        "Homeric Hymn 8 to Ares; Hesiod, Theogony 921-923.",
    ),
    _entity(
        "aphrodite", "Aphrodite", "goddess",
        ["Ourania", "Pandemos", "Kypris", "Philommeides"],
        "Goddess of love, beauty, and desire; the morning and "
        "evening star.",
        "Foam-born off Cyprus in Hesiod's account. Laughter-loving "
        "power of attraction over gods and mortals alike, whom even "
        "Zeus cannot fully resist.",
        {
            "planet": "Venus — the 'star of Aphrodite' (aster "
            "Aphrodites), Phosphoros at dawn and Hesperos at dusk",
            "day": "Friday (dies Veneris)",
            "symbols": ["dove", "myrtle", "rose", "scallop shell"],
            "domains": ["love", "beauty", "desire"],
        },
        "Hesiod, Theogony 188-206; Homeric Hymns 5, 6 and 10 to "
        "Aphrodite.",
    ),
    _entity(
        "hephaistos", "Hephaistos", "god",
        ["Klytotechnes", "Amphigyeeis"],
        "God of fire, the forge, and made things.",
        "The lame smith of Olympus whose workshop turned out the "
        "armour of Achilles, self-moving tripods, and the first "
        "woman, Pandora. Honoured by every craftsman at the anvil.",
        {
            "symbols": ["hammer", "anvil", "tongs"],
            "domains": ["fire", "smith-craft", "artifice"],
        },
        "Hesiod, Theogony 927-929; Homeric Hymn 20 to Hephaistos.",
    ),
    _entity(
        "hermes", "Hermes", "god",
        ["Argeiphontes", "Psychopompos", "Logios", "Diaktoros"],
        "Messenger of the gods; lord of roads, exchange, cunning "
        "speech, and the guiding of souls.",
        "Born in a cave on Kyllene and inventing the lyre by "
        "nightfall of his first day. Patron of travellers, traders, "
        "heralds, and thieves; as Psychopompos he leads the dead "
        "down.",
        {
            "planet": "Mercury — the 'star of Hermes' (aster Hermou)",
            "day": "Wednesday (dies Mercurii)",
            "symbols": ["caduceus", "winged sandals", "tortoise lyre"],
            "domains": ["travel", "exchange", "eloquence",
                        "soul-guiding"],
        },
        "Homeric Hymn 4 to Hermes; Hesiod, Theogony 938-939.",
    ),
    _entity(
        "hestia", "Hestia", "goddess",
        ["Boulaia"],
        "Goddess of the hearth; first and last of every libation.",
        "Eldest child of Kronos, who chose the hearth over marriage. "
        "Every household fire and every city's common hearth was "
        "hers; offerings opened and closed in her name.",
        {
            "symbols": ["hearth", "sacred flame"],
            "domains": ["hearth", "home", "the city's centre"],
        },
        "Hesiod, Theogony 453-454; Homeric Hymns 24 and 29 to Hestia.",
    ),
    _entity(
        "hekate", "Hekate", "goddess",
        ["Trioditis", "Soteira", "Phosphoros", "Kleidouchos",
         "Chthonia"],
        "Goddess of crossroads, keys, torches, and the liminal; "
        "singularly honoured by Zeus.",
        "Not one of the canonical Twelve, but Hesiod grants her a "
        "share in earth, sea, and starry heaven. Torch-bearing "
        "key-holder of the three ways; in the Greek Magical Papyri "
        "she is assimilated to Selene and Persephone.",
        {
            "planet": "Moon — in later antiquity, especially the "
            "Greek Magical Papyri",
            "symbols": ["paired torches", "key", "black dog",
                        "crossroads"],
            "domains": ["crossroads", "thresholds", "witchcraft",
                        "the restless dead"],
        },
        "Hesiod, Theogony 411-452; PGM IV.2708-2784.",
    ),
]


# ── 2 · thelemic-ritual-set ────────────────────────────────────────


def _p(text: str) -> dict[str, Any]:
    return {
        "type": "paragraph",
        "content": [{"type": "text", "text": text}],
    }


def _h(text: str) -> dict[str, Any]:
    return {
        "type": "heading",
        "attrs": {"level": 3},
        "content": [{"type": "text", "text": text}],
    }


def _prompt(placeholder: str) -> dict[str, Any]:
    return {
        "type": "paragraph",
        "attrs": {"placeholder": placeholder},
        "content": [],
    }


def _doc(*nodes: dict[str, Any]) -> str:
    return json.dumps({"type": "doc", "content": list(nodes)})


_RESH_TAHUTI = (
    "Tahuti standeth in His splendour at the prow, and Ra-Hoor "
    "abideth at the helm."
)

_LIBER_RESH_BODY = _doc(
    _h("Sunrise — facing East"),
    _p(
        "Hail unto Thee who art Ra in Thy rising, even unto Thee who "
        "art Ra in Thy strength, who travellest over the Heavens in "
        "Thy bark at the Uprising of the Sun."
    ),
    _p(_RESH_TAHUTI),
    _p("Hail unto Thee from the Abodes of Night!"),
    _h("Noon — facing South"),
    _p(
        "Hail unto Thee who art Ahathoor in Thy triumphing, even "
        "unto Thee who art Ahathoor in Thy beauty, who travellest "
        "over the heavens in thy bark at the Mid-course of the Sun."
    ),
    _p(_RESH_TAHUTI),
    _p("Hail unto Thee from the Abodes of Morning!"),
    _h("Sunset — facing West"),
    _p(
        "Hail unto Thee who art Tum in Thy setting, even unto Thee "
        "who art Tum in Thy joy, who travellest over the Heavens in "
        "Thy bark at the Down-going of the Sun."
    ),
    _p(_RESH_TAHUTI),
    _p("Hail unto Thee from the Abodes of Day!"),
    _h("Midnight — facing North"),
    _p(
        "Hail unto thee who art Khephra in Thy hiding, even unto "
        "Thee who art Khephra in Thy silence, who travellest over "
        "the heavens in Thy bark at the Midnight Hour of the Sun."
    ),
    _p(_RESH_TAHUTI),
    _p("Hail unto Thee from the Abodes of Evening."),
    _p(
        "And after each of these invocations thou shalt give the "
        "sign of silence, and afterward thou shalt perform the "
        "adoration that is taught thee by thy Superior. And then do "
        "thou compose Thyself to holy meditation."
    ),
    _prompt("Which adoration was this (sunrise / noon / sunset / "
            "midnight)?"),
    _prompt("One sentence on the quality of attention."),
)

_STAR_RUBY_BODY = _doc(
    _p(
        "Facing East, in the centre, draw deep deep deep thy breath, "
        "closing thy mouth with thy right forefinger prest against "
        "thy lower lip. Then dashing down the hand with a great "
        "sweep back and out, expelling forcibly thy breath, cry "
        "ΑΠΟ ΠΑΝΤΟΣ "
        "ΚΑΚΟΔΑΙΜΟ"
        "ΝΟΣ."
    ),
    _p(
        "With the same forefinger touch thy forehead, and say "
        "ΣΟΙ, thy member, and say Ω ΦΑ"
        "ΛΛΕ, thy right shoulder, and say ΙΣ"
        "ΧΥΡΟΣ, thy left shoulder, and say "
        "ΕΥΧΑΡΙΣΤΟ"
        "Σ; then clasp thine hands, locking the fingers, and "
        "cry ΙΑΩ."
    ),
    _p(
        "Advance to the East. Imagine strongly a Pentagram, aright, "
        "in thy forehead. Drawing the hands to the eyes, fling it "
        "forth, making the sign of Horus, and roar ΧΑΟ"
        "Σ. Retire thine hand in the sign of Hoor pa kraat."
    ),
    _p(
        "Go round to the North and repeat; but scream ΒΑ"
        "ΒΑΛΟΝ."
    ),
    _p(
        "Go round to the West and repeat; but say ΕΡΩ"
        "Σ."
    ),
    _p(
        "Go round to the South and repeat; but bellow ΨΥ"
        "ΧΗ."
    ),
    _p(
        "Completing the circle widdershins, retire to the centre, "
        "and raise thy voice in the Paian, with these words Ι"
        "Ο ΠΑΝ, with the signs of N.O.X."
    ),
    _p(
        "Extend the arms in the form of a Tau, and say low but "
        "clear: ΠΡΟ ΜΟΥ ΙΥ"
        "ΓΓΕΣ ΟΠΙΣΩ "
        "ΜΟΥ ΤΕΛΕΤΑ"
        "ΡΧΑΙ ΕΠΙ ΔΕ"
        "ΞΙΑ ΣΥΝΟΧΕ"
        "Σ ΕΠΑΡΙΣΤΕ"
        "ΡΑ ΔΑΙΜΟΝΕ"
        "Σ ΦΛΕΓΕΙ ΓΑ"
        "Ρ ΠΕΡΙ ΜΟΥ Ο "
        "ΑΣΤΗΡ ΤΩΝ Π"
        "ΕΝΤΕ ΚΑΙ ΕΝ "
        "ΤΗΙ ΣΤΗΛΗΙ "
        "Ο ΑΣΤΗΡ ΤΩΝ "
        "ΕΞ ΕΣΤΗΚΕ."
    ),
    _p(
        "Repeat the Cross Qabalistic, as above, and end as thou "
        "didst begin."
    ),
    _prompt("Felt sense before, and after."),
)

_WILL_BODY = _doc(
    _p(
        "The saying of Will before a meal, as printed in Moonchild, "
        "chapter VI (1929):"
    ),
    _p(
        "“Do what thou wilt shall be the whole of the Law. "
        "O Master of the Temple, what is thy will?”"
    ),
    _p("“It is my will to eat and drink.”"),
    _p("“Why shouldst thou eat and drink?”"),
    _p("“To sustain my body in strength.”"),
    _p(
        "“Why is it thy will that thy body may be sustained in "
        "strength?”"
    ),
    _p(
        "“That it may aid me in the accomplishment of the Great "
        "Work.”"
    ),
    _p("Then all present answer: “So mote it be.”"),
    _p("“Love is the law, love under will.”"),
    _prompt("The meal, the company, the attention brought to it."),
)

_THELEMIC_TEMPLATES: list[dict[str, Any]] = [
    {
        "ref": "liber-resh",
        "name": "Liber Resh vel Helios (full text)",
        "kind": "liber_resh",
        "description": (
            "The four solar adorations, full text as first published "
            "in The Equinox I(6), 1911. Public domain."
        ),
        "body_template": _LIBER_RESH_BODY,
        "default_title_pattern": "Resh — {date}",
        "default_glyph": "sun",
        "tradition": "thelemic",
        "license": "LicenseRef-Public-Domain",
        "source_citation": (
            "Aleister Crowley, Liber Resh vel Helios sub figura CC, "
            "first published The Equinox I(6), September 1911. "
            "Pre-1928 publication; public domain."
        ),
    },
    {
        "ref": "star-ruby",
        "name": "The Star Ruby (Book of Lies, 1913)",
        "kind": "ritual_log",
        "description": (
            "The Star Ruby banishing as printed in The Book of Lies, "
            "chapter 25 (1913) — the first published version, with "
            "the 1913 godnames. Public domain."
        ),
        "body_template": _STAR_RUBY_BODY,
        "default_title_pattern": "Star Ruby — {date}",
        "default_glyph": "shield",
        "tradition": "thelemic",
        "license": "LicenseRef-Public-Domain",
        "source_citation": (
            "Aleister Crowley, The Book of Lies, ch. 25 'The Star "
            "Ruby' (London, 1913). Pre-1928 publication; public "
            "domain. The revised version in Magick in Theory and "
            "Practice (1929) differs."
        ),
    },
    {
        "ref": "will",
        "name": "Will — the saying before meals",
        "kind": "ritual_log",
        "description": (
            "The Thelemic grace before meals, in the wording of its "
            "earliest print appearance (Moonchild, ch. VI, 1929). "
            "The later common form with the 3-5-3 knock derives from "
            "Magick Without Tears (1954), which is not reliably "
            "public domain and is not included."
        ),
        "body_template": _WILL_BODY,
        "default_title_pattern": "Will — {date}",
        "default_glyph": "feather",
        "tradition": "thelemic",
        "license": "LicenseRef-Public-Domain",
        "source_citation": (
            "Aleister Crowley, Moonchild, ch. VI (Mandrake Press, "
            "1929). US public domain since 2025 (95-year term); "
            "UK/EU public domain since 2018 (author d. 1947)."
        ),
    },
]


# ── 3 · classic-tarot-spreads ──────────────────────────────────────


def _pos(index: int, name: str, meaning: str) -> dict[str, Any]:
    return {"index": index, "name": name, "meaning": meaning}


_TAROT_SPREADS: list[dict[str, Any]] = [
    {
        "ref": "celtic-cross",
        "name": "Celtic Cross",
        "slug": "celtic-cross-classic",
        "description": (
            "The ten-card cross and staff, following the layout "
            "Waite published in The Pictorial Key to the Tarot "
            "(1911) as 'An Ancient Celtic Method of Divination'."
        ),
        "positions": [
            _pos(0, "The Present",
                 "What covers the querent — the heart of the matter "
                 "as it stands."),
            _pos(1, "The Crossing",
                 "What crosses it — the immediate challenge or aid "
                 "athwart the matter."),
            _pos(2, "The Crown",
                 "What crowns it — the conscious aim, or the best "
                 "that can come of it."),
            _pos(3, "The Root",
                 "What is beneath — the foundation, already part of "
                 "the querent's experience."),
            _pos(4, "Recent Past",
                 "What is behind — an influence just passing away."),
            _pos(5, "Near Future",
                 "What is before — an influence coming into action."),
            _pos(6, "The Querent",
                 "The querent's own attitude and position in the "
                 "matter."),
            _pos(7, "The House",
                 "The querent's environment — the people and "
                 "currents at work around the question."),
            _pos(8, "Hopes and Fears",
                 "What is hoped for and what is feared — often the "
                 "same card."),
            _pos(9, "The Outcome",
                 "What will come, given the currents the other nine "
                 "show."),
        ],
    },
    {
        "ref": "three-card",
        "name": "Three Card — Past, Present, Future",
        "slug": "three-card-classic",
        "description": (
            "The simplest traditional line: what has been, what is, "
            "what is forming."
        ),
        "positions": [
            _pos(0, "Past", "The root of the matter; what has been."),
            _pos(1, "Present", "The situation as it now stands."),
            _pos(2, "Future", "What is forming; the direction of "
                 "travel."),
        ],
    },
    {
        "ref": "horseshoe",
        "name": "Horseshoe",
        "slug": "horseshoe-classic",
        "description": (
            "The traditional seven-card arc of cartomancy, read from "
            "one tip of the horseshoe to the other."
        ),
        "positions": [
            _pos(0, "Past", "What led here."),
            _pos(1, "Present", "Where the matter stands now."),
            _pos(2, "Hidden Influences",
                 "What works on the matter unseen."),
            _pos(3, "Obstacles", "What stands in the way."),
            _pos(4, "Attitudes of Others",
                 "How those around the querent regard the matter."),
            _pos(5, "Advice", "The course the cards counsel."),
            _pos(6, "Outcome", "Where the counselled course leads."),
        ],
    },
    {
        "ref": "tree-of-life",
        "name": "Tree of Life",
        "slug": "tree-of-life-classic",
        "description": (
            "Ten cards on the sephiroth of the Kabbalistic Tree, "
            "each position read through its sphere."
        ),
        "positions": [
            _pos(0, "Kether",
                 "The highest ideal — the spiritual essence of the "
                 "question."),
            _pos(1, "Chokmah",
                 "Creative force — where initiative and drive "
                 "originate."),
            _pos(2, "Binah",
                 "Understanding — what gives form and limit; burdens "
                 "borne."),
            _pos(3, "Chesed",
                 "Mercy — resources, generosity, what expands the "
                 "matter."),
            _pos(4, "Geburah",
                 "Severity — friction, discipline, what must be cut "
                 "away."),
            _pos(5, "Tiphareth",
                 "The heart of the matter — its point of balance and "
                 "truth."),
            _pos(6, "Netzach",
                 "Victory — desires and emotions; the pull of "
                 "attraction."),
            _pos(7, "Hod",
                 "Splendour — intellect, communication, craft and "
                 "calculation."),
            _pos(8, "Yesod",
                 "Foundation — the unconscious machinery beneath "
                 "events."),
            _pos(9, "Malkuth",
                 "The Kingdom — the material outcome; how it lands "
                 "in the world."),
        ],
    },
    {
        "ref": "year-ahead",
        "name": "Year Ahead",
        "slug": "year-ahead-classic",
        "description": (
            "Thirteen cards: a centre card for the year's theme, "
            "then one for each month, laid as a wheel."
        ),
        "positions": [
            _pos(0, "Theme of the Year",
                 "The centre of the wheel — the current running "
                 "through the whole year."),
            *[
                _pos(i, f"Month {i}",
                     f"The tenor of month {i} of the twelve ahead.")
                for i in range(1, 13)
            ],
        ],
    },
]


# ── 4 · pgm-voces-selection ────────────────────────────────────────


def _voce(
    ref: str,
    name: str,
    source_text: str,
    transliteration: str,
    citation: str,
    planetary: list[str] | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "ref": ref,
        "name": name,
        "source_text": source_text,
        "source_script": "greek",
        "transliteration": transliteration,
        "source_citation": citation,
    }
    if planetary:
        item["planetary_associations"] = planetary
    return item


_PGM_VOCES: list[dict[str, Any]] = [
    _voce(
        "pgm-maskelli-maskello",
        "Maskelli Maskellō — formula opening",
        "ΜΑΣΚΕΛΛΙ Μ"
        "ΑΣΚΕΛΛΩ ΦΝ"
        "ΟΥΚΕΝΤΑΒΑ"
        "Ω",
        "Maskelli Maskellō Phnoukentabaō",
        "PGM IV.2752-2755 (invocation of Hekate-Selene); the "
        "Maskelli formula recurs across the corpus. Preisendanz "
        "1928, vol. I; Betz 1986.",
        ["moon"],
    ),
    _voce(
        "pgm-headless-one-names",
        "Names of the Headless One",
        "ΑΩΘ ΑΒΡΑΩΘ "
        "ΒΑΣΥΜ ΙΣΑΚ "
        "ΣΑΒΑΩΘ ΙΑΩ",
        "Aōth Abraōth Basym Isak Sabaōth Iaō",
        "PGM V.96-172 (Stele of Jeu the Hieroglyphist — the "
        "Headless Rite). Preisendanz 1928, vol. I; Betz 1986.",
    ),
    _voce(
        "pgm-semesilam",
        "Semesilam — the eternal sun",
        "ΣΕΜΕΣΙΛΑΜ",
        "Semesilam",
        "PGM IV.591 (within the so-called Mithras Liturgy, PGM "
        "IV.475-829); also inscribed on Abrasax gems. Glossed "
        "'eternal sun'.",
        ["sun"],
    ),
    _voce(
        "pgm-bainchoooch",
        "Bainchōōōch — soul of darkness",
        "ΒΑΙΝΧΩΩΩΧ",
        "Bainchōōōch",
        "PGM III.12; recurs through the corpus, e.g. the lamp rite "
        "of PGM IV.930-1114. Egyptian ba-en-kekui, 'soul of "
        "darkness'.",
    ),
    _voce(
        "pgm-neboutosoualeth",
        "Neboutosoualēth",
        "ΝΕΒΟΥΤΟΣΟ"
        "ΥΑΛΗΘ",
        "Neboutosoualēth",
        "PGM IV.2484 and IV.2708-2784 (invocations of "
        "Selene-Hekate), where it stands beside Aktiōphi and "
        "Ereschigal.",
        ["moon"],
    ),
    _voce(
        "pgm-aberamentho-palindrome",
        "The Aberamenthō palindrome",
        "ΑΒΕΡΑΜΕΝΘ"
        "ΩΟΥΛΕΡΘΕΞ"
        "ΑΝΑΞΕΘΡΕΛ"
        "ΥΟΩΘΝΕΜΑΡ"
        "ΕΒΑ",
        "Aberamenthōoulerthexanaxethrelyoōthnemareba",
        "PGM IV.154-285 (invocation of Typhon-Set); near-identical "
        "forms at PGM I.262-347 and in the Demotic papyri.",
    ),
    _voce(
        "pgm-chabrach-9999",
        "The formula of 9,999",
        "ΧΑΒΡΑΧ ΦΝΕ"
        "ΣΧΗΡ ΦΙΧΡΟ "
        "ΦΝΥΡΩ ΦΩΧΩ "
        "ΒΩΧ",
        "Chabrach Phneschēr Phichro Phnyrō Phōch"
        "ō Bōch",
        "PGM I.42-195; II.64-183; III.165-186; also on gems. The "
        "letters sum to 9,999 by Greek isopsephy; it recurs in "
        "solar contexts.",
        ["sun"],
    ),
    _voce(
        "pgm-thernopsi-formula",
        "The Thernōpsi formula",
        "ΨΙΝΩΘΕΡ ΝΩ"
        "ΨΙΘΕΡ ΘΕΡΝ"
        "ΩΨΙ",
        "Psinōther Nōpsither Thernōpsi",
        "PGM III.186; IV.828 (Mithras Liturgy); VII.216; also in "
        "the Pistis Sophia. Nine syllables permuting PSI-NŌ-"
        "THER.",
    ),
    _voce(
        "pgm-ephesia-grammata",
        "The Ephesia Grammata",
        "ΑΣΚΙΟΝ ΚΑΤ"
        "ΑΣΚΙΟΝ ΛΙΞ "
        "ΤΕΤΡΑΞ ΔΑΜ"
        "ΝΑΜΕΝΕΥΣ Α"
        "ΙΣΙΟΝ",
        "Askion Kataskion Lix Tetrax Damnameneus Aision",
        "The six Ephesian letters: Clement of Alexandria, Stromata "
        "V.8.45 (2nd c. CE); a variant opens the charm of Hekate "
        "Ereschigal at PGM LXX.4-25.",
    ),
    _voce(
        "pgm-abrasax",
        "Abrasax",
        "ΑΒΡΑΣΑΞ",
        "Abrasax",
        "Ubiquitous in the PGM (e.g. within the Headless Rite, PGM "
        "V.96-172) and on gems. Isopsephy 365, the days of the "
        "year.",
        ["sun"],
    ),
    _voce(
        "pgm-io-erbeth-typhonian",
        "The Typhonian logos — Iō Erbēth",
        "ΙΩ ΕΡΒΗΘ ΙΩ "
        "ΠΑΚΕΡΒΗΘ Ι"
        "Ω ΒΟΛΧΟΣΗΘ",
        "Iō Erbēth Iō Pakerbēth Iō "
        "Bolchosēth",
        "PGM IV.154-285 (invocation of Typhon-Set); the Typhonian "
        "logos also opens rites in PGM III.1-164.",
    ),
    _voce(
        "pgm-arbathiao",
        "Arbathiaō — the fourfold Iaō",
        "ΑΡΒΑΘΙΑΩ",
        "Arbathiaō",
        "PGM IV.1323-1330 (spell of revelation to the Bear); "
        "frequent in the corpus and on gems. Commonly read as "
        "Aramaic arba 'four' + Iaō.",
    ),
]


# ── 5 · planetary-correspondences ──────────────────────────────────


def _planet_row(
    ref: str,
    planet: str,
    metal: str,
    color: str,
    day: str,
    incense: str,
    stone: str,
) -> dict[str, Any]:
    return {
        "ref": ref,
        "planet": planet,
        "metal": metal,
        "color": color,
        "day": day,
        "incense": incense,
        "stone": stone,
        "source_citation": (
            "Agrippa, De Occulta Philosophia (1533): Book II ch. 10 "
            "(Scale of Seven — metals, stones); Book I ch. 44 "
            "(fumes); Book I ch. 49 (colours); days per the "
            "planetary week as used throughout Agrippa and the "
            "Heptameron (1559)."
        ),
    }


_PLANETARY_ROWS: list[dict[str, Any]] = [
    _planet_row("saturn", "Saturn", "lead", "black", "Saturday",
                "odoriferous roots (Agrippa's Saturnine fume class)",
                "onyx"),
    _planet_row("jupiter", "Jupiter", "tin", "blue", "Thursday",
                "odoriferous fruits — nutmeg, cloves", "sapphire"),
    _planet_row("mars", "Mars", "iron", "red", "Tuesday",
                "odoriferous woods — cypress, sanders", "diamond"),
    _planet_row("sun", "Sun", "gold", "gold and yellow", "Sunday",
                "gums — frankincense, mastic", "carbuncle"),
    _planet_row("venus", "Venus", "copper", "green", "Friday",
                "flowers — rose, violet", "emerald"),
    _planet_row("mercury", "Mercury", "quicksilver",
                "mixed and changeable", "Wednesday",
                "barks and peels — cinnamon, cassia", "agate"),
    _planet_row("moon", "Moon", "silver", "white and silver",
                "Monday", "leaves — myrtle, bay", "crystal"),
]


# ── 6 · traditional-incense-recipes ────────────────────────────────


def _ing(name: str, amount: str, notes: str | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"name": name, "amount": amount}
    if notes:
        item["notes"] = notes
    return item


def _step(text: str) -> dict[str, Any]:
    return {"text": text}


_INCENSE_RECIPES: list[dict[str, Any]] = [
    {
        "ref": "kyphi-of-plutarch",
        "name": "Kyphi (after Plutarch)",
        "kind": "incense",
        "description": (
            "The sixteen-ingredient Egyptian temple compound as "
            "Plutarch records it, burned at dusk. Plutarch gives the "
            "list and notes that sacred writings were read to the "
            "compounders; he gives no measures — the working method "
            "below is a modern phrasing."
        ),
        "ingredients": [
            _ing("honey", "to bind"),
            _ing("wine", "to macerate"),
            _ing("raisins", "1 part"),
            _ing("cyperus (galingale)", "1 part"),
            _ing("resin", "1 part"),
            _ing("myrrh", "1 part"),
            _ing("aspalathus", "1 part"),
            _ing("seseli", "1 part"),
            _ing("mastic", "1 part"),
            _ing("bitumen", "1 part"),
            _ing("sweet rush (thryon)", "1 part",
                 "identification debated"),
            _ing("dock (lapathum)", "1 part",
                 "identification debated"),
            _ing("juniper berries, greater", "1 part"),
            _ing("juniper berries, lesser", "1 part"),
            _ing("cardamom", "1 part"),
            _ing("sweet calamus", "1 part"),
        ],
        "steps": [
            _step("Grind the dry aromatics fine."),
            _step("Macerate the raisins in wine; work in the resins "
                  "and myrrh."),
            _step("Bind the blend with boiled honey and knead."),
            _step("Rest the mass, then form pellets and dry."),
            _step("Burn at dusk, as the Egyptian temples did."),
        ],
        "correspondences": {"planetary": "moon",
                            "hour": "evening fumigation"},
        "source_citation": (
            "Plutarch, De Iside et Osiride §79-80 (1st-2nd c. "
            "CE; PD). English in W. W. Goodwin's Plutarch's Morals "
            "(1874, PD)."
        ),
    },
    {
        "ref": "kyphi-of-dioscorides",
        "name": "Kyphi (after Dioscorides)",
        "kind": "incense",
        "description": (
            "The shorter kyphi of the De Materia Medica, which "
            "gives exact measures — consult the source for them; "
            "parts below keep its proportional spirit."
        ),
        "ingredients": [
            _ing("cyperus (galingale)", "per source measure"),
            _ing("juniper berries", "per source measure"),
            _ing("plump raisins, stoned", "per source measure"),
            _ing("purified resin", "per source measure"),
            _ing("sweet calamus", "per source measure"),
            _ing("aspalathus", "per source measure"),
            _ing("seseli", "per source measure"),
            _ing("myrrh", "per source measure"),
            _ing("old wine", "to soak"),
            _ing("honey", "boiled, to bind"),
        ],
        "steps": [
            _step("Soak the raisins in wine and grind with the "
                  "aspalathus and seseli."),
            _step("Add the ground aromatics and myrrh."),
            _step("Work into honey boiled to thickness; mix in the "
                  "resin."),
            _step("Form pellets and dry in the shade."),
        ],
        "correspondences": {"use": "temple fumigation"},
        "source_citation": (
            "Dioscorides, De Materia Medica I.25 (1st c. CE; PD). "
            "English in the Goodyer translation (1655, PD)."
        ),
    },
    {
        "ref": "ketoret-of-exodus",
        "name": "Temple incense of Exodus 30:34",
        "kind": "incense",
        "description": (
            "The four-spice temple compound of the Hebrew Bible: "
            "equal weights, salted, beaten small. The source itself "
            "reserves the compound for temple use (Ex. 30:37-38); "
            "it is included as a documented historical formula."
        ),
        "ingredients": [
            _ing("stacte", "a like weight"),
            _ing("onycha", "a like weight"),
            _ing("galbanum", "a like weight"),
            _ing("pure frankincense", "a like weight"),
            _ing("salt", "a seasoning",
                 "'seasoned with salt, pure and holy'"),
        ],
        "steps": [
            _step("Compound the four spices in equal weight, "
                  "seasoned with salt."),
            _step("Beat some of it very small (Ex. 30:36)."),
        ],
        "correspondences": {"use": "temple incense"},
        "source_citation": (
            "Exodus 30:34-38, KJV (1611, PD)."
        ),
    },
    {
        "ref": "orphic-frankincense-of-helios",
        "name": "Frankincense of Helios (Orphic rubric)",
        "kind": "incense",
        "description": (
            "The fumigation the Orphic Hymn to the Sun prescribes: "
            "libanomanna — frankincense grains with powdered "
            "frankincense (manna)."
        ),
        "ingredients": [
            _ing("frankincense tears", "1 part"),
            _ing("frankincense powder (manna)", "1 part"),
        ],
        "steps": [
            _step("Burn on charcoal at sunrise while the hymn is "
                  "read."),
        ],
        "correspondences": {"planetary": "sun"},
        "source_citation": (
            "Orphic Hymns, hymn 8 to Helios, rubric (c. 2nd-3rd c. "
            "CE; PD). English in Thomas Taylor's translation (1792, "
            "PD)."
        ),
    },
    {
        "ref": "orphic-storax-of-zeus",
        "name": "Storax of Zeus (Orphic rubric)",
        "kind": "incense",
        "description": (
            "The fumigation the Orphic Hymn to Zeus prescribes: "
            "storax alone."
        ),
        "ingredients": [
            _ing("storax resin", "as needed"),
        ],
        "steps": [
            _step("Burn on charcoal while the hymn is read."),
        ],
        "correspondences": {"planetary": "jupiter"},
        "source_citation": (
            "Orphic Hymns, hymn 15 to Zeus, rubric (c. 2nd-3rd c. "
            "CE; PD). English in Thomas Taylor's translation (1792, "
            "PD)."
        ),
    },
    {
        "ref": "seven-fumes-of-the-eighth-book",
        "name": "The seven planetary fumes (PGM XIII)",
        "kind": "incense",
        "description": (
            "The proper incense of each of the seven wanderers, as "
            "the Eighth Book of Moses opens: one simple fume per "
            "planet, burned alone for the planet of the working."
        ),
        "ingredients": [
            _ing("styrax", "for Kronos (Saturn)",
                 "'heavy and fragrant', says the papyrus"),
            _ing("malabathron", "for Zeus (Jupiter)"),
            _ing("kostos", "for Ares (Mars)"),
            _ing("frankincense", "for Helios (the Sun)"),
            _ing("Indian nard (spikenard)", "for Aphrodite (Venus)"),
            _ing("cassia", "for Hermes (Mercury)"),
            _ing("myrrh", "for Selene (the Moon)"),
        ],
        "steps": [
            _step("Choose the single fume proper to the planet of "
                  "the working."),
            _step("Burn it alone on charcoal."),
        ],
        "correspondences": {
            "planetary": "all seven, one fume each",
        },
        "source_citation": (
            "PGM XIII.11-20 (the Eighth Book of Moses; 4th c. CE "
            "papyrus). Preisendanz 1931, vol. II; Betz 1986."
        ),
    },
]


# ── 7 · dream-symbols-traditional ──────────────────────────────────

_ARTEMIDORUS = "Artemidorus, Oneirocritica (2nd c. CE; PD)"
_FOLK = "European folk dream tradition (compiled; own phrasing)"
_ANGLO_IRISH = "Anglo-Irish folk tradition (compiled; own phrasing)"


def _symbol(ref: str, symbol: str, meaning: str, citation: str) -> dict[str, Any]:
    return {
        "ref": ref,
        "symbol": symbol,
        "meaning": meaning,
        "source_citation": citation,
    }


_DREAM_SYMBOLS: list[dict[str, Any]] = [
    _symbol("teeth-falling", "Teeth falling out",
            "Loss touching the dreamer's household — traditionally "
            "read by which tooth is lost.",
            "Artemidorus, Oneirocritica I.31 (2nd c. CE; PD)"),
    _symbol("flying", "Flying",
            "Escape from present constraint; mastery when the height "
            "is chosen, exposure when it is not.",
            "Artemidorus, Oneirocritica II.68 (2nd c. CE; PD)"),
    _symbol("falling", "Falling",
            "Footing giving way in waking affairs — standing, "
            "confidence, or support.", _FOLK),
    _symbol("death", "One's own death",
            "Not read literally: a change of estate — the old life "
            "closing so another can open.", _ARTEMIDORUS),
    _symbol("wedding", "A wedding",
            "The folk inversion: a wedding dreamed foretells a "
            "funeral.", _ANGLO_IRISH),
    _symbol("funeral", "A funeral",
            "The pair of the wedding inversion: a funeral dreamed "
            "foretells a marriage or news of a birth.", _ANGLO_IRISH),
    _symbol("baby", "A newborn",
            "A beginning in the dreamer's keeping; news arriving "
            "small that will grow.", _FOLK),
    _symbol("clear-water", "Clear water",
            "Affairs running clean ahead; honest feeling.", _FOLK),
    _symbol("muddy-water", "Muddy water",
            "Trouble or confusion moving through the same channel.",
            _FOLK),
    _symbol("river", "Crossing a river",
            "A decisive passage — the far bank is a changed "
            "condition.", _FOLK),
    _symbol("fish", "Fish",
            "Gain drawn up from below; in the folk dream-books, a "
            "pregnancy.", _FOLK),
    _symbol("snake", "A snake",
            "An enemy or illness moving quietly; in the temple "
            "tradition, healing and renewal, as the skin is shed.",
            _ARTEMIDORUS),
    _symbol("dog", "A dog",
            "A known dog, a friend and their loyalty; a strange dog, "
            "a rival's approach.", _ARTEMIDORUS),
    _symbol("cat", "A cat",
            "Comfort at the hearth with a watchful edge — small "
            "deceits close to home.", _FOLK),
    _symbol("horse", "A horse",
            "Fortunate speed; matters carried faster than one's own "
            "legs could take them.", _FOLK),
    _symbol("birds", "Birds in flight",
            "Messages and rumours on the wing; their direction, the "
            "news's temper.", _FOLK),
    _symbol("dove", "A dove",
            "Peace after difficulty; a reconciling word or a letter "
            "of love.", _FOLK),
    _symbol("owl", "An owl",
            "A secret kept nearby, and a caution against speaking "
            "too soon.", _FOLK),
    _symbol("bees", "Bees",
            "Profit by steady industry — good to the farmer, says "
            "the old reading; stinging bees, gossip.", _ARTEMIDORUS),
    _symbol("spider", "A spider",
            "Patient work building unseen; small entanglements "
            "accumulating.", _FOLK),
    _symbol("eggs", "Eggs",
            "Hopes in fragile keeping; profit if carried unbroken.",
            _FOLK),
    _symbol("bread", "Bread",
            "Daily sufficiency; bread shared, an alliance made.",
            _FOLK),
    _symbol("honey", "Honey",
            "Sweetness won from labour; persuasion that will "
            "succeed.", _FOLK),
    _symbol("wine", "Wine",
            "Celebration in measure; dreamed excess counsels waking "
            "caution.", _FOLK),
    _symbol("fire", "Fire",
            "Transformation: contained on the hearth, prosperity; "
            "spreading loose, loss.", _FOLK),
    _symbol("house", "A house",
            "The dreamer's own person — its rooms the faculties, its "
            "state their state.", _ARTEMIDORUS),
    _symbol("door", "A door",
            "An offer opening or closing; note which way it swings.",
            _FOLK),
    _symbol("key", "A key",
            "Access granted, or a secret to be kept; a lost key, a "
            "confidence at risk.", _FOLK),
    _symbol("bridge", "A bridge",
            "Passage over a difficulty that cannot be waded; cross "
            "steadily.", _FOLK),
    _symbol("ladder", "A ladder",
            "Step-wise advancement; in the scriptural image, traffic "
            "between earth and heaven.", _FOLK),
    _symbol("mirror", "A mirror",
            "Self-regard and its distortions; in the folk custom, "
            "mirrors are veiled around the dead.", _ANGLO_IRISH),
    _symbol("ring", "A ring",
            "A bond or promise; a broken ring, a faith broken.",
            _FOLK),
    _symbol("shoes", "Shoes",
            "A journey: new shoes a new road, worn shoes a weary "
            "errand.", _FOLK),
    _symbol("gold", "Gold",
            "The dream-books' warning inversion: riches dreamed, "
            "care waking.", _FOLK),
    _symbol("mountain", "A mountain",
            "A great labour in view; the summit seen is the reward "
            "promised.", _FOLK),
    _symbol("garden", "A garden",
            "Matters flourishing under tendance; weeds name the "
            "neglected corner.", _FOLK),
    _symbol("tree", "A tree",
            "The family line and one's own growth; deep roots, sound "
            "stock.", _FOLK),
    _symbol("ship", "A ship",
            "An enterprise under way; its weather is the "
            "enterprise's weather.", _FOLK),
    _symbol("moon", "The moon",
            "The tides of feeling, and a woman of consequence in the "
            "matter.", _FOLK),
    _symbol("crossroads", "A crossroads",
            "A decision that cannot be deferred; in the Hellenic "
            "current, Hekate's ground.", _FOLK),
]


# ── The seven bundles ──────────────────────────────────────────────

BUNDLED_CONTENT: tuple[BundledContent, ...] = (
    BundledContent(
        slug="hellenic-pantheon",
        name="Hellenic Pantheon",
        type="pantheon",
        version="1.0.0",
        description=(
            "The twelve Olympians and Hekate — thirteen entities "
            "with epithets, domains, and the classically documented "
            "planetary and weekday attributions (marked where the "
            "link is Hellenistic rather than Homeric). The Twelve "
            "follow the canonical list with Hestia; some ancient "
            "lists seat Dionysos in her place. All phrasings are "
            "the project's own."
        ),
        license_spdx="CC0-1.0",
        source_citations=(
            {"citation": "Hesiod, Theogony (c. 700 BCE; PD); "
                         "Evelyn-White translation (1914, PD)."},
            {"citation": "The Homeric Hymns (antiquity; PD); "
                         "Evelyn-White translation (1914, PD)."},
            {"citation": "Theoi Project — reference compilation of "
                         "primary sources.",
             "url": "https://www.theoi.com/"},
        ),
        payloads=(
            PayloadDocument(kind="entities", items=_HELLENIC_ENTITIES),
        ),
    ),
    BundledContent(
        slug="thelemic-ritual-set",
        name="Thelemic Ritual Set",
        type="ritual-set",
        version="1.0.0",
        description=(
            "Liber Resh vel Helios (the four solar adorations), the "
            "Star Ruby in its 1913 Book of Lies text, and the "
            "'Will' meal saying in its earliest print wording "
            "(Moonchild, 1929) — as entry templates carrying the "
            "full public-domain texts. The Magick Without Tears "
            "form of Will (1954) is excluded: not reliably PD."
        ),
        license_spdx="LicenseRef-Public-Domain",
        source_citations=(
            {"citation": "Aleister Crowley, Liber Resh vel Helios "
                         "sub figura CC — The Equinox I(6), 1911 "
                         "(pre-1928; PD)."},
            {"citation": "Aleister Crowley, The Book of Lies, ch. 25 "
                         "'The Star Ruby' (1913; pre-1928; PD)."},
            {"citation": "Aleister Crowley, Moonchild, ch. VI "
                         "(Mandrake Press, 1929; US-PD since 2025, "
                         "UK/EU-PD since 2018)."},
        ),
        payloads=(
            PayloadDocument(
                kind="entry-templates", items=_THELEMIC_TEMPLATES
            ),
        ),
    ),
    BundledContent(
        slug="classic-tarot-spreads",
        name="Classic Tarot Spreads",
        type="tarot-spreads",
        version="1.0.0",
        description=(
            "Five traditional layouts — Celtic Cross, Three Card, "
            "Horseshoe, Tree of Life, and a thirteen-card Year "
            "Ahead. Spread layouts are traditional, uncopyrightable "
            "systems; every position meaning here is the project's "
            "own concise phrasing."
        ),
        license_spdx="CC0-1.0",
        source_citations=(
            {"citation": "A. E. Waite, The Pictorial Key to the "
                         "Tarot (1911, PD) — 'An Ancient Celtic "
                         "Method of Divination'."},
            {"citation": "Traditional cartomantic arrangements "
                         "(19th-20th c.); layouts are "
                         "uncopyrightable systems."},
        ),
        payloads=(
            PayloadDocument(kind="tarot-spreads", items=_TAROT_SPREADS),
        ),
    ),
    BundledContent(
        slug="pgm-voces-selection",
        name="PGM Voces — a Further Selection",
        type="voces-library",
        version="1.0.0",
        description=(
            "Twelve voces magicae from the Greek Magical Papyri, "
            "each with its PGM reference, chosen not to duplicate "
            "the corpus already bundled with the Workshop. Entries "
            "whose exact letters or line references could not be "
            "verified were excluded rather than approximated."
        ),
        license_spdx="LicenseRef-Public-Domain",
        source_citations=(
            {"citation": "PGM — Papyri Graecae Magicae (3rd c. BCE "
                         "- 4th c. CE; antiquity-PD). Karl "
                         "Preisendanz ed., 1928-31 (PD by age); "
                         "line references follow the standard PGM "
                         "numbering also used by Betz (1986)."},
            {"citation": "Clement of Alexandria, Stromata V.8.45 "
                         "(2nd c. CE; PD) — the Ephesia Grammata."},
        ),
        payloads=(
            PayloadDocument(kind="voces", items=_PGM_VOCES),
        ),
    ),
    BundledContent(
        slug="planetary-correspondences",
        name="Planetary Correspondences (Agrippa)",
        type="correspondences",
        version="1.0.0",
        description=(
            "The classical seven-planet table — metal, colour, day, "
            "fume class, and stone per Agrippa's De Occulta "
            "Philosophia (1533). Honest note: the correspondences "
            "payload kind has no v1 importer, so this bundle is "
            "importable as a reference document (listed, kept with "
            "the install record, not materialized as rows); table "
            "import lands v1.1."
        ),
        license_spdx="CC0-1.0",
        source_citations=(
            {"citation": "Heinrich Cornelius Agrippa, De Occulta "
                         "Philosophia libri tres (1533; PD); J.F. "
                         "English translation (1651, PD)."},
        ),
        payloads=(
            PayloadDocument(
                kind="correspondences", items=_PLANETARY_ROWS
            ),
        ),
    ),
    BundledContent(
        slug="traditional-incense-recipes",
        name="Traditional Incense Recipes",
        type="recipe-book",
        version="1.0.0",
        description=(
            "Six documented historical incense formulas: kyphi "
            "after Plutarch and after Dioscorides, the Exodus 30:34 "
            "temple compound, two Orphic Hymn fumigation rubrics, "
            "and the seven planetary fumes of the Eighth Book of "
            "Moses. Ingredient lists are documented facts; where a "
            "source gives no working method, the steps say so and "
            "offer a modern phrasing."
        ),
        license_spdx="CC0-1.0",
        source_citations=(
            {"citation": "Plutarch, De Iside et Osiride §79-80 "
                         "(PD); Goodwin translation (1874, PD)."},
            {"citation": "Dioscorides, De Materia Medica I.25 (PD); "
                         "Goodyer translation (1655, PD)."},
            {"citation": "Exodus 30:34-38, KJV (1611, PD)."},
            {"citation": "Orphic Hymns, fumigation rubrics (PD); "
                         "Taylor translation (1792, PD)."},
            {"citation": "PGM XIII.11-20 (PD); Preisendanz 1931, "
                         "vol. II."},
        ),
        payloads=(
            PayloadDocument(kind="recipes", items=_INCENSE_RECIPES),
        ),
    ),
    BundledContent(
        slug="dream-symbols-traditional",
        name="Traditional Dream Symbols",
        type="dream-symbols",
        version="1.0.0",
        description=(
            "Forty symbols with traditional meanings in the "
            "project's own words, each citing the tradition it "
            "compiles — Artemidorus' Oneirocritica or named folk "
            "traditions. Honest note: the dream-symbols payload "
            "kind has no v1 importer, so this bundle is importable "
            "as a reference document (listed, kept with the install "
            "record, not materialized as rows); symbol import lands "
            "v1.1."
        ),
        license_spdx="CC0-1.0",
        source_citations=(
            {"citation": "Artemidorus, Oneirocritica (2nd c. CE; "
                         "PD)."},
            {"citation": "European and Anglo-Irish folk dream "
                         "tradition (compiled; meanings phrased by "
                         "the project)."},
        ),
        payloads=(
            PayloadDocument(kind="dream-symbols", items=_DREAM_SYMBOLS),
        ),
    ),
)


def bundled_by_slug(slug: str) -> BundledContent | None:
    """The bundled package with this slug, or ``None``."""
    for bundle in BUNDLED_CONTENT:
        if bundle.slug == slug:
            return bundle
    return None


@cache
def build_bundled_mbf(slug: str) -> bytes:
    """Build the ``.mbf`` container for one bundled package.

    Deterministic (fixed ``created_at``), so the result is cached.
    Raises :class:`KeyError` for an unknown slug.
    """
    bundle = bundled_by_slug(slug)
    if bundle is None:
        raise KeyError(slug)
    return build_mbf(
        manifest_base=bundle.manifest_base(),
        payload_docs=list(bundle.payloads),
    )
