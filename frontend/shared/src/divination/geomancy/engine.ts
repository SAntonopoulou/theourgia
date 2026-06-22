/**
 * Geomancy engine — port of the verbatim mockup engine from
 * `Theourgia Geomancy.dc.html` (H04 handoff, lines 173–199).
 *
 * Only the four Mothers are data. Daughters, Nieces, Witnesses, Judge,
 * Reconciler, and the 12 houses are pure derivations — re-compute at
 * render time rather than store. The H04 worked example (`agent_data_
 * and_components_H04.md` §E) calls this out explicitly as "the
 * derived-cascade trap": a stored Daughter or Judge will silently
 * contradict the Mothers after any edit.
 */

/** Single point (1) or double point (2). The traditional even/odd line. */
export type GeoLine = 1 | 2;

/** Top-down 4-line geomantic figure. */
export type GeoFigure = readonly [GeoLine, GeoLine, GeoLine, GeoLine];

export type GeoFigureName =
  | "Via"
  | "Cauda Draconis"
  | "Puer"
  | "Fortuna Minor"
  | "Puella"
  | "Amissio"
  | "Carcer"
  | "Laetitia"
  | "Caput Draconis"
  | "Conjunctio"
  | "Acquisitio"
  | "Rubeus"
  | "Fortuna Major"
  | "Albus"
  | "Tristitia"
  | "Populus";

/**
 * Binary-key → name lookup. Verbatim from `Theourgia Geomancy.dc.html`
 * line 173 (the `FIG()` method). Joining the four lines top-down gives
 * the key; e.g. Via = "1111" (all single), Populus = "2222" (all double).
 */
export const GEO_FIGURES: Record<string, GeoFigureName> = {
  "1111": "Via",
  "1112": "Cauda Draconis",
  "1121": "Puer",
  "1122": "Fortuna Minor",
  "1211": "Puella",
  "1212": "Amissio",
  "1221": "Carcer",
  "1222": "Laetitia",
  "2111": "Caput Draconis",
  "2112": "Conjunctio",
  "2121": "Acquisitio",
  "2122": "Rubeus",
  "2211": "Fortuna Major",
  "2212": "Albus",
  "2221": "Tristitia",
  "2222": "Populus",
};

/**
 * Per-figure traditional meaning text. Verbatim from
 * `Theourgia Geomancy.dc.html` line 174. The chrome must NEVER recolour
 * Carcer / Rubeus / Cauda Draconis as red — the difficulty is in the
 * text ("Read as information, not condemnation"), not the palette.
 */
export const GEO_MEANINGS: Record<GeoFigureName, string> = {
  Via: "The Way — change, a journey, things in motion. Yes, but expect the road to turn.",
  Populus:
    "The People — a gathering, no single will. Wait; the matter is not yours alone.",
  Acquisitio:
    "Gain — what is sought is obtained. A favourable verdict for the venture.",
  Amissio:
    "Loss — what is held slips away. Better to wait, or to let go cleanly.",
  "Fortuna Major":
    "Greater Fortune — strong, lasting success won by one’s own power.",
  "Fortuna Minor":
    "Lesser Fortune — swift success, but fleeting. Move quickly and lightly.",
  Laetitia:
    "Joy — upward movement, health, good cheer. The omen is bright.",
  Tristitia:
    "Sorrow — things bend downward; patience and endurance are asked.",
  Conjunctio:
    "Union — a meeting, a joining of matters. Favourable for partnership.",
  Carcer:
    "The Prison — binding, delay, enclosure. Hold; the time is not free. Read as information, not condemnation.",
  Albus: "White — peace and clarity, but slow. Wise counsel, cool judgement.",
  Rubeus:
    "Red — passion, haste, disorder. An unstable, cautionary verdict.",
  Puer: "The Boy — force, ardour, rash energy. Good for contests, poor for peace.",
  Puella:
    "The Girl — harmony, attraction, gentleness. Favourable in most matters.",
  "Caput Draconis":
    "The Dragon’s Head — a threshold, a good beginning. Enter.",
  "Cauda Draconis":
    "The Dragon’s Tail — an ending, an exit. Good for letting go.",
};

/**
 * Per-figure planetary + elemental attribution. Verbatim from
 * `Theourgia Geomancy.dc.html` line 175. Uses Unicode planetary glyphs
 * directly (☽ ♃ ♀ ☉ ♄ ☿ ♂ ☊ ☋).
 */
export const GEO_ATTRIBUTIONS: Record<GeoFigureName, string> = {
  Via: "☽ Moon · Water",
  Populus: "☽ Moon · Water",
  Acquisitio: "♃ Jupiter · Earth",
  Amissio: "♀ Venus · Fire",
  "Fortuna Major": "☉ Sun · Earth",
  "Fortuna Minor": "☉ Sun · Fire",
  Laetitia: "♃ Jupiter · Air",
  Tristitia: "♄ Saturn · Earth",
  Conjunctio: "☿ Mercury · Air",
  Carcer: "♄ Saturn · Earth",
  Albus: "☿ Mercury · Water",
  Rubeus: "♂ Mars · Fire",
  Puer: "♂ Mars · Fire",
  Puella: "♀ Venus · Water",
  "Caput Draconis": "☊ Node · Earth",
  "Cauda Draconis": "☋ Node · Fire",
};

/** Stable ordering for UI iteration. The canonical 16, matching the FIG keys. */
export const GEO_FIGURE_ORDER: readonly GeoFigureName[] = [
  "Via",
  "Cauda Draconis",
  "Puer",
  "Fortuna Minor",
  "Puella",
  "Amissio",
  "Carcer",
  "Laetitia",
  "Caput Draconis",
  "Conjunctio",
  "Acquisitio",
  "Rubeus",
  "Fortuna Major",
  "Albus",
  "Tristitia",
  "Populus",
];

/**
 * Resolve the figure's traditional name from its line pattern.
 * Returns `null` when the input isn't one of the 16 valid figures
 * (defensive — every valid GeoFigure resolves).
 */
export function figureName(figure: GeoFigure): GeoFigureName | null {
  const key = figure.join("");
  return GEO_FIGURES[key] ?? null;
}

/**
 * Per-line geomantic addition: lines match → 2 (even / double point),
 * lines differ → 1 (odd / single point). Verbatim from
 * `Theourgia Geomancy.dc.html` line 177.
 */
export function combine(a: GeoFigure, b: GeoFigure): GeoFigure {
  return [
    a[0] === b[0] ? 2 : 1,
    a[1] === b[1] ? 2 : 1,
    a[2] === b[2] ? 2 : 1,
    a[3] === b[3] ? 2 : 1,
  ];
}

/**
 * The full geomantic cascade — everything derived from the four
 * Mothers in one pass. Verbatim from `Theourgia Geomancy.dc.html`
 * lines 192-199.
 *
 * Daughters[i] = transpose(mothers)[i]   (lines of Daughter i are the
 * i-th line of each Mother, top→bottom)
 *
 * Nieces 1-2  = combine(M1,M2), combine(M3,M4)
 * Nieces 3-4  = combine(D1,D2), combine(D3,D4)
 * Right witness = combine(N1, N2)
 * Left witness  = combine(N3, N4)
 * Judge         = combine(right witness, left witness)
 * Reconciler    = combine(judge, M1)
 *
 * Houses [I..XII] = [M1..M4, D1..D4, N1..N4]
 */
export interface GeomancyShield {
  mothers: readonly [GeoFigure, GeoFigure, GeoFigure, GeoFigure];
  daughters: readonly [GeoFigure, GeoFigure, GeoFigure, GeoFigure];
  nieces: readonly [GeoFigure, GeoFigure, GeoFigure, GeoFigure];
  rightWitness: GeoFigure;
  leftWitness: GeoFigure;
  judge: GeoFigure;
  reconciler: GeoFigure;
  /** Houses I..XII, ordered: M1, M2, M3, M4, D1, D2, D3, D4, N1, N2, N3, N4. */
  houses: readonly GeoFigure[];
}

export function deriveShield(
  mothers: readonly [GeoFigure, GeoFigure, GeoFigure, GeoFigure],
): GeomancyShield {
  // Daughter i's line j = Mother j's line i (transpose)
  const daughters: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
    [mothers[0][0], mothers[1][0], mothers[2][0], mothers[3][0]],
    [mothers[0][1], mothers[1][1], mothers[2][1], mothers[3][1]],
    [mothers[0][2], mothers[1][2], mothers[2][2], mothers[3][2]],
    [mothers[0][3], mothers[1][3], mothers[2][3], mothers[3][3]],
  ];

  const nieces: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
    combine(mothers[0], mothers[1]),
    combine(mothers[2], mothers[3]),
    combine(daughters[0], daughters[1]),
    combine(daughters[2], daughters[3]),
  ];

  const rightWitness = combine(nieces[0], nieces[1]);
  const leftWitness = combine(nieces[2], nieces[3]);
  const judge = combine(rightWitness, leftWitness);
  const reconciler = combine(judge, mothers[0]);

  const houses: readonly GeoFigure[] = [
    mothers[0],
    mothers[1],
    mothers[2],
    mothers[3],
    daughters[0],
    daughters[1],
    daughters[2],
    daughters[3],
    nieces[0],
    nieces[1],
    nieces[2],
    nieces[3],
  ];

  return {
    mothers,
    daughters,
    nieces,
    rightWitness,
    leftWitness,
    judge,
    reconciler,
    houses,
  };
}

/**
 * Generate four random Mothers. Each line is single (1) or double (2)
 * with equal probability. Verbatim from `Theourgia Geomancy.dc.html`
 * line 282.
 *
 * In production the practitioner traditionally makes 16 lines of random
 * dots and reduces each to even/odd. This generator is the "generate
 * for me" mode; the surface also supports an "I cast on paper" mode
 * where each Mother is hand-entered via tap-to-toggle.
 */
export function generateMothers(
  random: () => number = Math.random,
): [GeoFigure, GeoFigure, GeoFigure, GeoFigure] {
  const line = (): GeoLine => (random() < 0.5 ? 1 : 2);
  const mother = (): GeoFigure => [line(), line(), line(), line()];
  return [mother(), mother(), mother(), mother()];
}
