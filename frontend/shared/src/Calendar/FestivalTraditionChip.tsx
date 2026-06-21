/**
 * FestivalTraditionChip — colored filter pill for one of the five
 * (eventually seven) festival traditions.
 *
 * Per `Theourgia Calendar.dc.html`. The pill is a button; when the
 * tradition is `soon` the button is disabled, rendered with a "soon"
 * affix, and the dot stays muted regardless of the on/off state.
 *
 * Composed by the calendar surface and the Today widgets.
 */

import { type CSSProperties } from "react";

import {
  FESTIVAL_TRADITIONS,
  type FestivalTradition,
} from "./festivals.js";

export interface FestivalTraditionChipProps {
  tradition: FestivalTradition;
  active?: boolean;
  onToggle?: (next: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

export function FestivalTraditionChip({
  tradition,
  active = false,
  onToggle,
  className,
  style,
}: FestivalTraditionChipProps) {
  const meta = FESTIVAL_TRADITIONS[tradition];
  const disabled = meta.soon;
  const showColor = active || meta.soon;

  return (
    <button
      type="button"
      className={className}
      onClick={() => !disabled && onToggle?.(!active)}
      aria-pressed={active}
      aria-disabled={disabled}
      disabled={disabled}
      data-component="festival-tradition-chip"
      data-tradition={tradition}
      data-active={active ? "true" : "false"}
      data-soon={meta.soon ? "true" : "false"}
      title={
        meta.soon
          ? `${meta.name} festivals — awaiting practitioner consultation`
          : `Toggle ${meta.name} overlay`
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 11px",
        borderRadius: 999,
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--line-2)" : "var(--line)",
        background: active ? "var(--bg-3)" : "transparent",
        color: meta.soon
          ? "var(--ink-mute)"
          : active
            ? "var(--ink)"
            : "var(--ink-mute)",
        opacity: meta.soon ? 0.55 : 1,
        cursor: meta.soon ? "default" : "pointer",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: showColor ? meta.color : "var(--line-2)",
          flex: "none",
        }}
      />
      {meta.name}
      {meta.soon ? (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginLeft: 2,
          }}
        >
          soon
        </span>
      ) : null}
    </button>
  );
}
