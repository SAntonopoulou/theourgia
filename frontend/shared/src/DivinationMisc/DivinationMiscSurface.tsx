/**
 * DivinationMiscSurface — the four lighter methods clustered.
 *
 * Verbatim composition from `Theourgia Divination Misc.dc.html`.
 * In-page `role="tablist"` switches between four sub-surfaces:
 *   pendulum · bibliomancy · horary · scrying
 *
 * Per H04 §S7.2 — these four share one OracleTabs "More" slot
 * rather than four separate nav entries.
 */

import { type CSSProperties, useState } from "react";

import { BibliomancyPanel } from "./BibliomancyPanel.js";
import { HoraryPanel } from "./HoraryPanel.js";
import { MethodTablist } from "./MethodTablist.js";
import { PendulumPanel } from "./PendulumPanel.js";
import { type ScrySessionLog, ScryingPanel } from "./ScryingPanel.js";
import type { DivMiscMethod } from "./copy.js";

export interface DivinationMiscSurfaceProps {
  /** Initial sub-method. Defaults to 'pendulum'. */
  initialMethod?: DivMiscMethod;
  /** Hooks for the per-method save buttons. Pendulum fires on Ask
   *  (its save moment) with a `PendulumAskEntry`; scrying fires with
   *  a `ScrySaveEntry`. */
  onSavePendulum?: (entry: unknown) => void;
  onSaveBibliomancy?: (entry: unknown) => void;
  onSaveHorary?: () => void;
  onSaveScrying?: (entry: unknown) => void;
  /** Scrying "Past sessions" rail — from ``GET /api/v1/scrying/sessions``. */
  scryPastSessions?: readonly ScrySessionLog[];
  /** Current planetary hour label, when the composing route already
   *  has the data (trance overlay context line). */
  scryPlanetaryHour?: string;
  className?: string;
  style?: CSSProperties;
}

export function DivinationMiscSurface({
  initialMethod = "pendulum",
  onSavePendulum,
  onSaveBibliomancy,
  onSaveHorary,
  onSaveScrying,
  scryPastSessions,
  scryPlanetaryHour,
  className,
  style,
}: DivinationMiscSurfaceProps) {
  const [method, setMethod] = useState<DivMiscMethod>(initialMethod);

  return (
    <div
      data-component="divination-misc-surface"
      data-method={method}
      className={className}
      style={style}
    >
      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 28px 60px",
        }}
      >
        <div style={{ maxWidth: 1020, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <MethodTablist value={method} onChange={setMethod} />
          </div>

          {method === "pendulum" ? <PendulumPanel onAsk={onSavePendulum} /> : null}
          {method === "biblio" ? <BibliomancyPanel onLog={onSaveBibliomancy} /> : null}
          {method === "horary" ? <HoraryPanel onSave={onSaveHorary} /> : null}
          {method === "scrying" ? (
            <ScryingPanel
              onSave={onSaveScrying}
              pastSessions={scryPastSessions}
              planetaryHour={scryPlanetaryHour}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
