"""Bundled voces magicae — public-domain corpus.

A starter library of voces magicae the practitioner can browse and
fork into their own vault. Every entry carries a verifiable PD
citation; nothing here is improvised. The Theourgia project does
not invent magical words.

Sources (all PD):
  • PGM — Greek Magical Papyri (3rd c. BCE – 4th c. CE). Compiled
    by Karl Preisendanz, *Papyri Graecae Magicae* (1928-31); English
    translation by H. D. Betz, *The Greek Magical Papyri in
    Translation* (Chicago, 1986). Underlying papyri are antiquity-PD;
    Preisendanz edition is also PD by age. The Betz translation is a
    20th-c. compilation — citations point at the PGM line numbers,
    which is the authoritative pre-translation reference.
  • Sefer Yetzirah (Book of Formation) — c. 2nd-6th c., PD.
  • *Lemegeton Clavicula Salomonis* — 17th c. compilation (Sloane MS
    2731), PD.
  • *Heptameron, seu Elementa Magica* — pseudo-Peter of Abano,
    printed Venice 1559, PD.
  • Sanskrit bīja mantras — Vedic and Tantric corpora, antiquity-PD.

Entries are kept faithful to the source. Transliterations follow
common scholarly convention (Beta Code / SBL Hebrew). IPA is
approximate where reconstruction is uncertain (the H05 designer
locked IPA as advisory not authoritative).

To extend this corpus, submit a PR with a verifiable PD citation
(papyrus number, manuscript folio, edition page) — improvisation is
explicitly rejected per the project's voce honesty rule.
"""

from __future__ import annotations

from dataclasses import dataclass, field

__all__ = ["BUNDLED_VOCES", "BundledVoce", "bundled_by_id"]


@dataclass(frozen=True)
class BundledVoce:
    """An immutable bundled voce fixture."""

    id: str
    name: str
    source_text: str
    source_script: str
    transliteration: str | None
    ipa: str | None
    source_citation: str
    planetary_associations: tuple[str, ...] = field(default=())
    elemental_associations: tuple[str, ...] = field(default=())


BUNDLED_VOCES: tuple[BundledVoce, ...] = (
    # ── PGM (Greek Magical Papyri) ──────────────────────────────────
    BundledVoce(
        id="pgm_iv_2785_hekate_hymn_opening",
        name="Hekate Hymn — opening invocation",
        source_text="ΕΛΘΕ ΜΟΙ ΩΦΡΟΥ ΚΕΡΑΑΥ ΚΡΕΟΥΣ ΑΣΗΡ",
        source_script="greek",
        transliteration="elthe moi, Phrou, Keraau, Kreous, Aser",
        ipa="ˈel.tʰe moi̯ pʰruː ke.ˈraː.au̯ ˈkre.us aˈseːr",
        source_citation="PGM IV.2785 (Preisendanz 1928 vol I, p. 168)",
        planetary_associations=("moon",),
    ),
    BundledVoce(
        id="pgm_iv_2858_hekate_three_named",
        name="Hekate Three-Named",
        source_text="ΕΡΕΣΧΙΓΑΛ ΑΚΤΙΩΦΙ ΒΟΡΦΟΡΒΑ",
        source_script="greek",
        transliteration="Ereschigal, Aktiōphi, Borphorba",
        ipa="e.res.kʰi.ˈɡal ak.ti.ˈoː.pʰi bor.pʰor.ˈba",
        source_citation="PGM IV.2858–62 (Betz 1986 p. 90)",
        planetary_associations=("moon", "saturn"),
        elemental_associations=("earth",),
    ),
    BundledVoce(
        id="pgm_iv_1115_ogdoad_of_helios",
        name="Ogdoad of Helios",
        source_text="ΑΧΕΒΥΚΡΩΜ",
        source_script="greek",
        transliteration="Achebykrōm",
        ipa="a.kʰe.byˈkroːm",
        source_citation="PGM IV.1115 (Preisendanz 1928 vol I, p. 100)",
        planetary_associations=("sun",),
        elemental_associations=("fire",),
    ),
    BundledVoce(
        id="pgm_xiii_206_aeon_invocation",
        name="Aeon — by His Hidden Names",
        source_text="ΙΑΩ ΣΑΒΑΩΘ ΑΔΩΝΑΙ ΕΛΩΑΙ",
        source_script="greek",
        transliteration="Iaō Sabaōth Adōnai Elōai",
        ipa="iˈaː.oː sa.baˈoːtʰ a.doːˈnai̯ eˈloːai̯",
        source_citation="PGM XIII.206 (Preisendanz 1931 vol II, p. 90)",
        planetary_associations=("sun",),
    ),
    BundledVoce(
        id="pgm_xii_265_seal_of_the_living_god",
        name="Seal of the Living God",
        source_text="ΣΕΣΕΓΓΕΝ ΒΑΡΦΑΡΑΓΓΗΣ",
        source_script="greek",
        transliteration="Sesenggen Barpharangēs",
        ipa="se.seŋˈɡen bar.pʰa.ranˈɡɛːs",
        source_citation="PGM XII.265 (Preisendanz 1931 vol II, p. 72)",
        planetary_associations=("saturn",),
    ),
    BundledVoce(
        id="pgm_iv_94_anoch",
        name="Anoch — Hidden Name",
        source_text="ΑΝΟΧ",
        source_script="greek",
        transliteration="Anoch",
        ipa="aˈnokʰ",
        source_citation="PGM IV.94 (Betz 1986 p. 38)",
    ),
    BundledVoce(
        id="pgm_iv_3007_pnoute_invocation",
        name="Invocation of P-noute (The God)",
        source_text="ⲠⲚⲞⲨⲦⲈ ⲠⲚⲞⲨⲦⲈ ⲠⲚⲞⲨⲦⲈ",
        source_script="coptic",
        transliteration="Pnoute, Pnoute, Pnoute",
        ipa="pˈnu.te pˈnu.te pˈnu.te",
        source_citation="PGM IV.3007 (Betz 1986 p. 96)",
    ),
    BundledVoce(
        id="pgm_v_96_great_name",
        name="The Great Name",
        source_text="ΑΕΗΙΟΥΩ",
        source_script="greek",
        transliteration="A-E-Ē-I-O-Y-Ō",
        ipa="ˈaː ˈeː ˈɛː ˈiː ˈoː ˈyː ˈoː",
        source_citation="PGM V.96 (Preisendanz 1928 vol I, p. 184)",
        planetary_associations=(
            "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon",
        ),
    ),
    BundledVoce(
        id="pgm_iii_146_iaeo_seven_vowels",
        name="Iaeō — Sevenfold Vowels Reversed",
        source_text="ΩΥΟΙΗΕΑ",
        source_script="greek",
        transliteration="Ō-Y-O-I-Ē-E-A",
        ipa="ˈoː ˈyː ˈoː ˈiː ˈɛː ˈeː ˈaː",
        source_citation="PGM III.146 (Betz 1986 p. 21)",
    ),
    BundledVoce(
        id="pgm_iv_1226_ablanathanalba",
        name="Ablanathanalba — Palindrome",
        source_text="ΑΒΛΑΝΑΘΑΝΑΛΒΑ",
        source_script="greek",
        transliteration="Ablanathanalba",
        ipa="a.bla.naˈtʰa.nal.ba",
        source_citation="PGM IV.1226 (Preisendanz 1928 vol I, p. 108)",
    ),
    BundledVoce(
        id="pgm_iv_3014_akrammachamarei",
        name="Akrammachamarei",
        source_text="ΑΚΡΑΜΜΑΧΑΜΑΡΕΙ",
        source_script="greek",
        transliteration="Akrammachamarei",
        ipa="a.kram.ma.kʰa.maˈrei̯",
        source_citation="PGM IV.3014 (Betz 1986 p. 96)",
    ),
    BundledVoce(
        id="pgm_iv_1219_phno_eai_iabok",
        name="Phno-Eai-Iabok",
        source_text="ΦΝΟ ΕΑΙ ΙΑΒΟΚ",
        source_script="greek",
        transliteration="Phno Eai Iabok",
        ipa="pʰnoː ˈe.ai̯ iˈaː.bok",
        source_citation="PGM IV.1219 (Preisendanz 1928 vol I, p. 108)",
    ),
    # ── Hebrew names of power ───────────────────────────────────────
    BundledVoce(
        id="hebrew_yhvh_tetragrammaton",
        name="Tetragrammaton",
        source_text="יהוה",
        source_script="hebrew",
        transliteration="YHVH",
        ipa=None,
        source_citation=(
            "Hebrew Bible (PD); first appears Genesis 2:4. Sefer "
            "Yetzirah 1.1 (c. 2nd-6th c., PD)."
        ),
        planetary_associations=("sun",),
    ),
    BundledVoce(
        id="hebrew_adonai",
        name="Adonai",
        source_text="אֲדֹנָי",
        source_script="hebrew",
        transliteration="ʾĂdōnāy",
        ipa="ʔa.doˈnaːj",
        source_citation="Hebrew Bible (PD); Genesis 15:2.",
    ),
    BundledVoce(
        id="hebrew_ehyeh",
        name="Ehyeh asher Ehyeh",
        source_text="אֶהְיֶה אֲשֶׁר אֶהְיֶה",
        source_script="hebrew",
        transliteration="ʾEhyeh ʾAšer ʾEhyeh",
        ipa="ʔeh.ˈje ʔaˈʃer ʔeh.ˈje",
        source_citation="Hebrew Bible (PD); Exodus 3:14.",
    ),
    BundledVoce(
        id="hebrew_shaddai",
        name="El Shaddai",
        source_text="אֵל שַׁדַּי",
        source_script="hebrew",
        transliteration="ʾĒl Šadday",
        ipa="ʔeːl ʃadˈdaj",
        source_citation="Hebrew Bible (PD); Genesis 17:1.",
    ),
    BundledVoce(
        id="hebrew_agla_notarikon",
        name="AGLA — Notarikon",
        source_text="אגלא",
        source_script="hebrew",
        transliteration="Atah Gibor Le'olam Adonai",
        ipa="aˈtaː ɡiˈbor lə.ʕoˈlaːm ʔa.doˈnaːj",
        source_citation=(
            "Notarikon attested in medieval Kabbalistic prayer-book "
            "tradition; used in *Heptameron* (1559)."
        ),
    ),
    BundledVoce(
        id="hebrew_yah",
        name="Yah",
        source_text="יָהּ",
        source_script="hebrew",
        transliteration="Yāh",
        ipa="jaːh",
        source_citation="Hebrew Bible (PD); Psalm 68:5 et al.",
    ),
    # ── Lemegeton / Solomonic conjurations ──────────────────────────
    BundledVoce(
        id="lemegeton_tetragrammaton_anaphaxeton",
        name="Tetragrammaton · Anaphaxeton · Primeumaton",
        source_text="Tetragrammaton · Anaphaxeton · Primeumaton",
        source_script="latin",
        transliteration=None,
        ipa=None,
        source_citation=(
            "*Lemegeton Clavicula Salomonis* — Sloane MS 2731, 17th c. "
            "(PD). First conjuration of Ars Goetia."
        ),
    ),
    BundledVoce(
        id="lemegeton_first_conjuration",
        name="First Conjuration — Lemegeton",
        source_text=(
            "Ego invoco vos in nominibus Adonai · Iah · Eheieh · "
            "Tetragrammaton · Saday · Zeboaoth · Elion · Elohim · "
            "Adonai-Tzabaoth"
        ),
        source_script="latin",
        transliteration=None,
        ipa=None,
        source_citation=(
            "*Lemegeton Clavicula Salomonis* — Sloane MS 2731, fol. 7v, "
            "17th c. (PD)."
        ),
    ),
    # ── Heptameron — angelic names of the seven days ────────────────
    BundledVoce(
        id="heptameron_michael_sunday",
        name="Michael — Angel of Sunday",
        source_text="Michael",
        source_script="latin",
        transliteration=None,
        ipa="mi.kʰaˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Sunday operation. PD."
        ),
        planetary_associations=("sun",),
    ),
    BundledVoce(
        id="heptameron_gabriel_monday",
        name="Gabriel — Angel of Monday",
        source_text="Gabriel",
        source_script="latin",
        transliteration=None,
        ipa="ɡa.briˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Monday operation. PD."
        ),
        planetary_associations=("moon",),
    ),
    BundledVoce(
        id="heptameron_samael_tuesday",
        name="Samael — Angel of Tuesday",
        source_text="Samael",
        source_script="latin",
        transliteration=None,
        ipa="sa.maˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Tuesday operation. PD."
        ),
        planetary_associations=("mars",),
    ),
    BundledVoce(
        id="heptameron_raphael_wednesday",
        name="Raphael — Angel of Wednesday",
        source_text="Raphael",
        source_script="latin",
        transliteration=None,
        ipa="ra.pʰaˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Wednesday operation. PD."
        ),
        planetary_associations=("mercury",),
    ),
    BundledVoce(
        id="heptameron_sachiel_thursday",
        name="Sachiel — Angel of Thursday",
        source_text="Sachiel",
        source_script="latin",
        transliteration=None,
        ipa="sa.kʰiˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Thursday operation. PD."
        ),
        planetary_associations=("jupiter",),
    ),
    BundledVoce(
        id="heptameron_anael_friday",
        name="Anael — Angel of Friday",
        source_text="Anael",
        source_script="latin",
        transliteration=None,
        ipa="a.naˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Friday operation. PD."
        ),
        planetary_associations=("venus",),
    ),
    BundledVoce(
        id="heptameron_cassiel_saturday",
        name="Cassiel — Angel of Saturday",
        source_text="Cassiel",
        source_script="latin",
        transliteration=None,
        ipa="kas.siˈeːl",
        source_citation=(
            "Pseudo-Peter of Abano, *Heptameron* (Venice 1559), "
            "Saturday operation. PD."
        ),
        planetary_associations=("saturn",),
    ),
    # ── Sanskrit bīja mantras ───────────────────────────────────────
    BundledVoce(
        id="sanskrit_om",
        name="Om — Pranava",
        source_text="ॐ",
        source_script="sanskrit",
        transliteration="oṃ",
        ipa="oːm",
        source_citation=(
            "Māṇḍūkya Upaniṣad (c. 800 BCE – 500 CE, PD). The pranava "
            "mantra is attested across the Vedic corpus."
        ),
        elemental_associations=("aether",),
    ),
    BundledVoce(
        id="sanskrit_hrim",
        name="Hrīṃ — Māyā bīja",
        source_text="ह्रीं",
        source_script="sanskrit",
        transliteration="hrīṃ",
        ipa="hriːm",
        source_citation=(
            "Devī Mahātmya (Mārkaṇḍeya Purāṇa, c. 500–600 CE, PD); "
            "tantric bīja for Mahāmāyā."
        ),
    ),
    BundledVoce(
        id="sanskrit_aim",
        name="Aiṃ — Sarasvatī bīja",
        source_text="ऐं",
        source_script="sanskrit",
        transliteration="aiṃ",
        ipa="ai̯m",
        source_citation=(
            "Sarasvatī Tantra (PD); the speech-and-wisdom bīja."
        ),
    ),
    BundledVoce(
        id="sanskrit_klim",
        name="Klīṃ — Kāma bīja",
        source_text="क्लीं",
        source_script="sanskrit",
        transliteration="klīṃ",
        ipa="kliːm",
        source_citation=(
            "Various tantric corpora (Kāmakalāvilāsa, PD); the bīja "
            "of desire and attraction."
        ),
        planetary_associations=("venus",),
    ),
    BundledVoce(
        id="sanskrit_shrim",
        name="Śrīṃ — Lakṣmī bīja",
        source_text="श्रीं",
        source_script="sanskrit",
        transliteration="śrīṃ",
        ipa="ɕriːm",
        source_citation=(
            "Śrī Sūkta (Ṛgveda khila, PD); bīja for abundance and "
            "well-being."
        ),
        planetary_associations=("jupiter", "venus"),
    ),
)


def bundled_by_id(bundled_id: str) -> BundledVoce | None:
    """Return the bundled voce with the given id, or ``None``."""
    for voce in BUNDLED_VOCES:
        if voce.id == bundled_id:
            return voce
    return None
