/**
 * VocesMagicaeSurface — composes the H05 final Workshop surface.
 *
 * Topbar → search + tradition filter + "New voce" → vertical voce
 * list → VoceDetailDrawer + NewVoceModal overlays.
 */

import { type CSSProperties, useMemo, useState } from "react";

import {
  DEMO_VOCES,
  TRADITION_FILTERS,
  VM_NEW_BUTTON_LABEL,
  VM_SEARCH_PLACEHOLDER,
  VM_TOPBAR_SUBTITLE,
  VM_TOPBAR_TITLE,
  type VoceRecord,
  type VoceTradition,
} from "./copy.js";
import { NewVoceModal } from "./NewVoceModal.js";
import { VoceDetailDrawer } from "./VoceDetailDrawer.js";
import { VoceRow } from "./VoceRow.js";

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "13px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const FILTER_BAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "12px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const CHIP_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  whiteSpace: "nowrap",
  flex: "none",
  cursor: "pointer",
};

const CHIP_ON: CSSProperties = {
  ...CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export interface VocesMagicaeSurfaceProps {
  initialTradition?: VoceTradition;
  voces?: readonly VoceRecord[];
  onNewVoce?: (payload: {
    script: string;
    text: string;
    translit: string;
    ipa: string;
    citation: string;
  }) => void;
  onRecordNew?: (voceId: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function VocesMagicaeSurface({
  initialTradition = "all",
  voces = DEMO_VOCES,
  onNewVoce,
  onRecordNew,
  className,
  style,
}: VocesMagicaeSurfaceProps) {
  const [trad, setTrad] = useState<VoceTradition>(initialTradition);
  const [query, setQuery] = useState("");
  const [openVoceId, setOpenVoceId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voces.filter((v) => {
      if (trad !== "all" && v.trad !== trad) return false;
      if (!q) return true;
      return (
        v.text.toLowerCase().includes(q) ||
        v.translit.toLowerCase().includes(q) ||
        v.citation.toLowerCase().includes(q)
      );
    });
  }, [voces, trad, query]);

  const openVoce = useMemo(
    () => voces.find((v) => v.id === openVoceId) ?? null,
    [voces, openVoceId],
  );

  return (
    <div
      data-component="voces-magicae-surface"
      data-tradition={trad}
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {VM_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {VM_TOPBAR_SUBTITLE}
          </div>
        </div>
      </header>

      <div style={FILTER_BAR_STYLE}>
        <div style={{ position: "relative", flex: "0 1 260px" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-mute)",
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx={11} cy={11} r={7} />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={VM_SEARCH_PLACEHOLDER}
            data-search-input
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
            }}
          />
        </div>
        <div
          className="scroll"
          role="group"
          aria-label="Tradition"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
            minWidth: 0,
          }}
        >
          {TRADITION_FILTERS.map((t) => {
            const on = trad === t.key;
            return (
              <button
                key={t.key}
                type="button"
                data-tradition-filter={t.key}
                aria-pressed={on}
                onClick={() => setTrad(t.key)}
                style={on ? CHIP_ON : CHIP_BASE}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-action="open-new"
          onClick={() => setNewOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 15px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            flex: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {VM_NEW_BUTTON_LABEL}
        </button>
      </div>

      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "18px 24px 40px",
        }}
      >
        <div
          data-voces-list
          style={{
            maxWidth: 880,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filtered.map((voce) => (
            <VoceRow
              key={voce.id}
              voce={voce}
              onOpen={(id) => setOpenVoceId(id)}
            />
          ))}
          {filtered.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              No voces match this filter.
            </p>
          ) : null}
        </div>
      </main>

      <VoceDetailDrawer
        open={openVoce !== null}
        voce={openVoce}
        onClose={() => setOpenVoceId(null)}
        onRecordNew={onRecordNew}
      />
      <NewVoceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSave={(payload) => onNewVoce?.(payload)}
      />
    </div>
  );
}
