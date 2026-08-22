/**
 * The correspondence canon — the phone's
 * ``assets/correspondences/taxonomy.json`` (version 1), emitted as TS so both
 * platforms read the SAME axes. The phone is the source of truth: regenerate
 * from that file on change, never edit here. Subjects are what a value is
 * ABOUT (Mars, Fire, Tiphareth); categories are what KIND of value (metal,
 * stone, perfume). A pack fills values against these axes but never coins one.
 */

export interface TaxonomySubject {
  key: string;
  label: string;
  family: string;
  glyph?: string;
}

export interface TaxonomyCategory {
  key: string;
  label: string;
  group: string;
}

export const TAXONOMY_VERSION = 1;

export const TAXONOMY_SUBJECTS: readonly TaxonomySubject[] = [
  { key: "planet.sun", label: "Sun", family: "planet", glyph: "☉" },
  { key: "planet.moon", label: "Moon", family: "planet", glyph: "☽" },
  { key: "planet.mercury", label: "Mercury", family: "planet", glyph: "☿" },
  { key: "planet.venus", label: "Venus", family: "planet", glyph: "♀" },
  { key: "planet.mars", label: "Mars", family: "planet", glyph: "♂" },
  { key: "planet.jupiter", label: "Jupiter", family: "planet", glyph: "♃" },
  { key: "planet.saturn", label: "Saturn", family: "planet", glyph: "♄" },
  { key: "planet.uranus", label: "Uranus", family: "planet", glyph: "♅" },
  { key: "planet.neptune", label: "Neptune", family: "planet", glyph: "♆" },
  { key: "planet.pluto", label: "Pluto", family: "planet", glyph: "♇" },
  { key: "element.fire", label: "Fire", family: "element", glyph: "🜂" },
  { key: "element.water", label: "Water", family: "element", glyph: "🜄" },
  { key: "element.air", label: "Air", family: "element", glyph: "🜁" },
  { key: "element.earth", label: "Earth", family: "element", glyph: "🜃" },
  { key: "element.spirit", label: "Spirit", family: "element", glyph: "🜀" },
  { key: "sign.aries", label: "Aries", family: "sign", glyph: "♈" },
  { key: "sign.taurus", label: "Taurus", family: "sign", glyph: "♉" },
  { key: "sign.gemini", label: "Gemini", family: "sign", glyph: "♊" },
  { key: "sign.cancer", label: "Cancer", family: "sign", glyph: "♋" },
  { key: "sign.leo", label: "Leo", family: "sign", glyph: "♌" },
  { key: "sign.virgo", label: "Virgo", family: "sign", glyph: "♍" },
  { key: "sign.libra", label: "Libra", family: "sign", glyph: "♎" },
  { key: "sign.scorpio", label: "Scorpio", family: "sign", glyph: "♏" },
  { key: "sign.sagittarius", label: "Sagittarius", family: "sign", glyph: "♐" },
  { key: "sign.capricorn", label: "Capricorn", family: "sign", glyph: "♑" },
  { key: "sign.aquarius", label: "Aquarius", family: "sign", glyph: "♒" },
  { key: "sign.pisces", label: "Pisces", family: "sign", glyph: "♓" },
  { key: "sephira.kether", label: "Kether", family: "sephira" },
  { key: "sephira.chokmah", label: "Chokmah", family: "sephira" },
  { key: "sephira.binah", label: "Binah", family: "sephira" },
  { key: "sephira.chesed", label: "Chesed", family: "sephira" },
  { key: "sephira.geburah", label: "Geburah", family: "sephira" },
  { key: "sephira.tiphareth", label: "Tiphareth", family: "sephira" },
  { key: "sephira.netzach", label: "Netzach", family: "sephira" },
  { key: "sephira.hod", label: "Hod", family: "sephira" },
  { key: "sephira.yesod", label: "Yesod", family: "sephira" },
  { key: "sephira.malkuth", label: "Malkuth", family: "sephira" },
  { key: "sephira.daath", label: "Da'ath", family: "sephira" },
];

export const TAXONOMY_CATEGORIES: readonly TaxonomyCategory[] = [
  { key: "metal", label: "Metal", group: "material" },
  { key: "stone", label: "Stone", group: "material" },
  { key: "mineral", label: "Mineral", group: "material" },
  { key: "plant", label: "Plant", group: "material" },
  { key: "tree", label: "Tree", group: "material" },
  { key: "perfume", label: "Perfume & incense", group: "material" },
  { key: "oil", label: "Oil", group: "material" },
  { key: "drug", label: "Drug", group: "material" },
  { key: "animal", label: "Animal", group: "material" },
  { key: "bird", label: "Bird", group: "material" },
  { key: "fish", label: "Fish", group: "material" },
  { key: "animal-mythic", label: "Mythic beast", group: "material" },
  { key: "bodypart", label: "Body part", group: "material" },
  { key: "place", label: "Place", group: "material" },
  { key: "colour", label: "Colour", group: "colour" },
  { key: "deity.egyptian", label: "Egyptian deity", group: "deity" },
  { key: "deity.greek", label: "Greek deity", group: "deity" },
  { key: "deity.roman", label: "Roman deity", group: "deity" },
  { key: "deity.norse", label: "Norse deity", group: "deity" },
  { key: "deity.hindu", label: "Hindu deity", group: "deity" },
  { key: "deity.sumerian", label: "Sumerian deity", group: "deity" },
  { key: "archangel", label: "Archangel", group: "spirit" },
  { key: "angel", label: "Angel", group: "spirit" },
  { key: "angelic-order", label: "Angelic order", group: "spirit" },
  { key: "intelligence", label: "Intelligence", group: "spirit" },
  { key: "spirit", label: "Spirit", group: "spirit" },
  { key: "qliphoth", label: "Qliphoth", group: "spirit" },
  { key: "demon", label: "Demon", group: "spirit" },
  { key: "divine-name", label: "Divine name", group: "name" },
  { key: "god-name", label: "God-name", group: "name" },
  { key: "number", label: "Number", group: "symbolic" },
  { key: "tarot", label: "Tarot", group: "symbolic" },
  { key: "geomantic-figure", label: "Geomantic figure", group: "symbolic" },
  { key: "weapon", label: "Magical weapon", group: "symbolic" },
  { key: "power", label: "Magical power", group: "symbolic" },
  { key: "virtue", label: "Virtue", group: "symbolic" },
  { key: "vice", label: "Vice", group: "symbolic" },
  { key: "sense", label: "Sense", group: "symbolic" },
  { key: "note", label: "Musical note", group: "symbolic" },
  { key: "direction", label: "Direction", group: "symbolic" },
];

/** The canon's families, first-mention ordered — the scales a chart can run down. */
export function taxonomyFamilies(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of TAXONOMY_SUBJECTS) {
    if (!seen.has(s.family)) {
      seen.add(s.family);
      out.push(s.family);
    }
  }
  return out;
}

/** A family's members, in the canon's order. */
export function familyMembers(family: string): TaxonomySubject[] {
  return TAXONOMY_SUBJECTS.filter((s) => s.family === family);
}
