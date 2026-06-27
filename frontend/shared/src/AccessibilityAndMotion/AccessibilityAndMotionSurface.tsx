/**
 * AccessibilityAndMotion — H10 Cluster B7 surface.
 *
 * Crisis-aware nudge uses the CARE palette (`--peer-ok`), NEVER
 * `--danger` or any urgency chrome.
 *
 * The component is controlled — parent owns AccessibilityPrefs and
 * receives change events. The parent typically persists to
 * localStorage (no backend endpoint for v1).
 */

import type { CSSProperties } from "react";

import {
  type AccessibilityPrefs,
  CRISIS_NUDGE,
  formatScaleLabel,
  PREAMBLE,
  TEXT_SCALE,
  TOGGLES,
} from "./copy.js";

export interface AccessibilityAndMotionSurfaceProps {
  value: AccessibilityPrefs;
  onChange: (next: AccessibilityPrefs) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 580,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        position: "relative",
        width: 44,
        height: 25,
        borderRadius: 13,
        background: on ? "var(--accent)" : "var(--bg-3)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: on ? "var(--accent)" : "var(--line-2)",
        flex: "none",
        transition: "background .18s ease",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 21 : 2,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: on ? "var(--accent-ink)" : "var(--ink-mute)",
          transition: "left .18s ease",
        }}
      />
    </button>
  );
}

function TogglePane({
  label,
  note,
  on,
  onToggle,
}: {
  label: string;
  note: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        padding: "15px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          cursor: "pointer",
        }}
      >
        <Switch on={on} onToggle={onToggle} label={label} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {note}
          </div>
        </div>
      </label>
    </div>
  );
}

export function AccessibilityAndMotionSurface({
  value,
  onChange,
  className,
  style,
}: AccessibilityAndMotionSurfaceProps) {
  const update = (partial: Partial<AccessibilityPrefs>) =>
    onChange({ ...value, ...partial });

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.55,
          margin: "0 0 22px",
        }}
      >
        {PREAMBLE}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <TogglePane
          label={TOGGLES.reducedMotion.label}
          note={TOGGLES.reducedMotion.note}
          on={value.reducedMotion}
          onToggle={() => update({ reducedMotion: !value.reducedMotion })}
        />
        <TogglePane
          label={TOGGLES.contrast.label}
          note={TOGGLES.contrast.note}
          on={value.contrast}
          onToggle={() => update({ contrast: !value.contrast })}
        />
        <TogglePane
          label={TOGGLES.autoplay.label}
          note={TOGGLES.autoplay.note}
          on={value.autoplay}
          onToggle={() => update({ autoplay: !value.autoplay })}
        />
      </div>

      <div
        style={{
          padding: "15px 17px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {TEXT_SCALE.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--accent)",
            }}
            data-text-scale-label
          >
            {formatScaleLabel(value.textScale)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginBottom: 11,
          }}
        >
          {TEXT_SCALE.note}
        </div>
        <input
          type="range"
          aria-label={TEXT_SCALE.label}
          min={TEXT_SCALE.min}
          max={TEXT_SCALE.max}
          step={TEXT_SCALE.step}
          value={value.textScale}
          onChange={(e) =>
            update({ textScale: parseFloat(e.target.value) })
          }
          style={{ width: "100%" }}
        />
      </div>

      <div
        style={{
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--peer-ok-border)",
          borderRadius: "var(--r-md)",
          background: "var(--peer-ok-soft)",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 13,
            cursor: "pointer",
          }}
        >
          <Switch
            on={value.crisisNudge}
            onToggle={() => update({ crisisNudge: !value.crisisNudge })}
            label={CRISIS_NUDGE.label}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              {CRISIS_NUDGE.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                marginTop: 4,
                lineHeight: 1.55,
              }}
            >
              {CRISIS_NUDGE.body}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
