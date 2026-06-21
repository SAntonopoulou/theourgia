/**
 * Parametric lunar terminator path generator.
 *
 * Lifted verbatim from `Theourgia Today Widgets.dc.html` — designer's
 * mockup is the source of truth. Returns an SVG path `d` string for
 * the illuminated portion of the moon, drawn into a 100×100 viewBox
 * with the disc circumscribed at (50, 50) radius 44.
 *
 * The `f` argument is the illumination fraction (0..1). `waxing`
 * controls which limb (right vs left in the northern frame) is the
 * outer edge. Mirror via the parent <g> transform for southern
 * hemisphere orientation.
 *
 *   - f ≤ 0.001 → empty path (new moon)
 *   - f ≥ 0.999 → full disc
 *   - 0 < f ≤ 0.5 (crescent) — terminator bulges toward lit limb
 *   - 0.5 < f < 1 (gibbous)  — terminator bulges away from lit limb
 */
export function moonPath(f: number, waxing: boolean): string {
  const r = 44;
  const c = 50;
  if (f <= 0.001) return "";
  if (f >= 0.999) {
    return `M${c},${c - r} A ${r},${r} 0 1 1 ${c},${c + r} A ${r},${r} 0 1 1 ${c},${c - r} Z`;
  }
  const sweepLimb = waxing ? 1 : 0;
  const rt = (r * (1 - 2 * f)).toFixed(2);
  const big = f > 0.5;
  const sweepTerm = waxing ? (big ? 1 : 0) : big ? 0 : 1;
  return `M${c},${c - r} A ${r},${r} 0 0 ${sweepLimb} ${c},${c + r} A ${Math.abs(Number(rt))},${r} 0 0 ${sweepTerm} ${c},${c - r} Z`;
}

/**
 * Compute the canonical phase metrics from days since the last
 * new moon. Uses the synodic month length of 29.53059 days.
 */
export function phaseMetricsFromDays(
  daysSinceNewMoon: number,
  synodicDays = 29.53059,
): {
  cycleProgress: number;
  angleRad: number;
  angleDeg: number;
  illumination: number;
  waxing: boolean;
} {
  const cycleProgress = daysSinceNewMoon / synodicDays;
  const angleRad = cycleProgress * 2 * Math.PI;
  const angleDeg = Math.round(cycleProgress * 360);
  const illumination = (1 - Math.cos(angleRad)) / 2;
  const waxing = cycleProgress < 0.5;
  return { cycleProgress, angleRad, angleDeg, illumination, waxing };
}

export interface PhaseCycleStep {
  name: string;
  f: number;
  waxing: boolean;
}

export const PHASE_CYCLE: PhaseCycleStep[] = [
  { name: "New moon", f: 0.0, waxing: true },
  { name: "Waxing crescent", f: 0.25, waxing: true },
  { name: "First quarter", f: 0.5, waxing: true },
  { name: "Waxing gibbous", f: 0.78, waxing: true },
  { name: "Full moon", f: 1.0, waxing: true },
  { name: "Waning gibbous", f: 0.78, waxing: false },
  { name: "Last quarter", f: 0.5, waxing: false },
  { name: "Waning crescent", f: 0.25, waxing: false },
];

/**
 * Resolve the named phase that best describes the given metrics.
 * Boundaries follow the standard astronomical thresholds.
 */
export function phaseName(illumination: number, waxing: boolean): string {
  if (illumination < 0.025) return "New moon";
  if (illumination > 0.975) return "Full moon";
  if (Math.abs(illumination - 0.5) < 0.025) {
    return waxing ? "First quarter" : "Last quarter";
  }
  if (waxing) {
    return illumination < 0.5 ? "Waxing crescent" : "Waxing gibbous";
  }
  return illumination < 0.5 ? "Waning crescent" : "Waning gibbous";
}
