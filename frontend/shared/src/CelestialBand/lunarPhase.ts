/**
 * Lunar phase labelling.
 *
 * suncalc's ``getMoonIllumination`` returns:
 *   - fraction: 0 to 1 (illuminated portion of the disk)
 *   - phase: 0 to 1 (0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter)
 *   - angle: midpoint-of-bright-limb angle (we don't use it here)
 *
 * We map phase fraction → one of the 8 traditional bins, biased so each
 * label covers a 1/8 slice centered on its primary phase.
 */

export type LunarPhaseName =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

const ORDER: LunarPhaseName[] = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

const LABELS: Record<LunarPhaseName, string> = {
  new: "New",
  "waxing-crescent": "Waxing Crescent",
  "first-quarter": "First Quarter",
  "waxing-gibbous": "Waxing Gibbous",
  full: "Full",
  "waning-gibbous": "Waning Gibbous",
  "last-quarter": "Last Quarter",
  "waning-crescent": "Waning Crescent",
};

/** Map a 0–1 phase fraction to a named bin. Each bin spans 1/8 of the cycle. */
export function lunarPhaseName(phase: number): LunarPhaseName {
  // Bias by 1/16 so each label is centered on its archetypal phase.
  const shifted = (phase + 1 / 16) % 1;
  const slot = Math.floor(shifted * 8) % 8;
  return ORDER[slot] as LunarPhaseName;
}

export function lunarPhaseLabel(phase: number): string {
  return LABELS[lunarPhaseName(phase)];
}
