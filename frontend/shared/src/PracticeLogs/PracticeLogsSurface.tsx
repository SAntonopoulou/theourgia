/**
 * PracticeLogsSurface — composes the four sub-panels under one
 * in-page tablist.
 *
 * Verbatim shell from `Theourgia Practice Logs.dc.html` lines 93-262.
 * Lives under the Practice nav section (VaultNav active="practicelogs",
 * routed at /practice-logs). Distinct from the Divination cluster: the
 * practice logs are not divinations and don't appear under OracleTabs.
 */

import { type CSSProperties, useState } from "react";

import { AsanaPanel } from "./AsanaPanel.js";
import { BanishingPanel } from "./BanishingPanel.js";
import { LogTypeTablist } from "./LogTypeTablist.js";
import { DreamPanel } from "./DreamPanel.js";
import { PathworkingPanel } from "./PathworkingPanel.js";
import { type PracticeLogTab } from "./copy.js";

export interface PracticeLogsSurfaceProps {
  initialTab?: PracticeLogTab;
  /** Called when any sub-panel saves; subtype identifies which log. */
  onSave?: (
    tab: PracticeLogTab,
    payload: Record<string, unknown>,
  ) => void;
  className?: string;
  style?: CSSProperties;
}

export function PracticeLogsSurface({
  initialTab = "dream",
  onSave,
  className,
  style,
}: PracticeLogsSurfaceProps) {
  const [tab, setTab] = useState<PracticeLogTab>(initialTab);

  const forward = (key: PracticeLogTab) =>
    (payload: Record<string, unknown>) => {
      onSave?.(key, payload);
    };

  return (
    <div
      data-component="practice-logs-surface"
      data-tab={tab}
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
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <LogTypeTablist
            value={tab}
            onChange={setTab}
            style={{ marginBottom: 24 }}
          />

          {tab === "dream" ? (
            <DreamPanel onSave={forward("dream")} />
          ) : null}
          {tab === "path" ? (
            <PathworkingPanel onSave={forward("path")} />
          ) : null}
          {tab === "asana" ? (
            <AsanaPanel onSave={forward("asana")} />
          ) : null}
          {tab === "banish" ? (
            <BanishingPanel onSave={forward("banish")} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
