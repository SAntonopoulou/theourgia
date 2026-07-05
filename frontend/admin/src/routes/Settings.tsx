/**
 * Settings.
 *
 * Composition tracks ``Theourgia Settings.dc.html``:
 *   Topbar  · "Settings" + "Appearance, security, networks & plugins".
 *   Subnav  · 8 sections (Account · Security & encryption · Networks &
 *             federation · Plugins · Appearance (default) · Accessibility ·
 *             Billing · About).
 *   Body    · Appearance section ships first with theme cards, mode
 *             toggle, font-role table, accessibility switches, and the
 *             encryption-per-content-type panel.
 *
 * Other sections render a "lands soon" stub until their backend wiring
 * arrives. The earlier Phase-02 identity-management UI moves into the
 * Account section in a later batch.
 */

import {
  applyThemeState,
  LanguagePicker,
  type Mode,
  readThemeState,
  type Theme,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

type SectionKey =
  | "account"
  | "security"
  | "networks"
  | "plugins"
  | "appearance"
  | "accessibility"
  | "billing"
  | "about";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "security", label: "Security & encryption" },
  { key: "networks", label: "Networks & federation" },
  { key: "plugins", label: "Plugins" },
  { key: "appearance", label: "Appearance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "billing", label: "Billing" },
  { key: "about", label: "About" },
];

function Subnav({
  active,
  onChange,
}: {
  active: SectionKey;
  onChange: (k: SectionKey) => void;
}) {
  return (
    <nav
      className="scroll"
      style={{
        flex: "none",
        width: 212,
        borderRight: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: "18px 14px",
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
      }}
    >
      {SECTIONS.map((s) => {
        const selected = s.key === active;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 12px",
              borderRadius: "var(--r-md, 8px)",
              color: selected ? "var(--ink)" : "var(--ink-soft)",
              background: selected ? "var(--accent-soft)" : "transparent",
              boxShadow: selected ? "inset 2px 0 0 var(--accent)" : "none",
              border: "none",
              fontFamily: "inherit",
              fontSize: "inherit",
              cursor: "pointer",
              textAlign: "left",
              marginBottom: 2,
            }}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

function ThemeCard({
  theme,
  label,
  family,
  swatches,
  selected,
  onClick,
}: {
  theme: Theme;
  label: string;
  family: string;
  swatches: string[];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: "var(--r-lg, 14px)",
        background: selected ? "var(--bg-3)" : "var(--bg-2)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
      data-theme-card={theme}
    >
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {swatches.map((color, i) => (
          <span
            key={`${theme}-sw-${i}`}
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: color,
              border: i === 0 ? "1px solid rgba(236,229,214,0.25)" : "none",
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 16,
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
        }}
      >
        {family}
      </div>
    </button>
  );
}

function AccessibilitySwitch({
  label,
  desc,
  on,
  onChange,
  topBorder,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (next: boolean) => void;
  topBorder: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "11px 0",
        borderTop: topBorder ? "1px solid var(--line)" : "none",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)" }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
          {desc}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        style={{
          position: "relative",
          width: 38,
          height: 22,
          borderRadius: 999,
          border: "1px solid var(--line-2)",
          background: on ? "var(--accent-soft)" : "var(--bg-3)",
          flex: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: on ? "var(--accent)" : "var(--ink-mute)",
            transition: "transform 0.16s ease",
            transform: on ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

function FontRoleRow({
  role,
  family,
  fontFamily,
  isLast,
}: {
  role: string;
  family: string;
  fontFamily: string;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "13px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--line)",
        background: "var(--bg-2)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-soft)",
          flex: 1,
        }}
      >
        {role}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          fontFamily,
          fontSize: 14,
          color: "var(--ink)",
        }}
      >
        {family}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-mute)"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

const A11Y_PREFS_KEY = "theourgia.a11y.prefs";

function readA11yPrefs(): { contrast: boolean; reducedMotion: boolean; textScale: number } {
  try {
    const raw = window.localStorage.getItem(A11Y_PREFS_KEY);
    if (!raw) return { contrast: false, reducedMotion: false, textScale: 1 };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      contrast: Boolean(p.contrast),
      reducedMotion: Boolean(p.reducedMotion),
      textScale: typeof p.textScale === "number" ? p.textScale : 1,
    };
  } catch {
    return { contrast: false, reducedMotion: false, textScale: 1 };
  }
}

function writeA11yPrefs(prefs: {
  contrast: boolean;
  reducedMotion: boolean;
  textScale: number;
}): void {
  try {
    window.localStorage.setItem(A11Y_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort.
  }
  const root = document.documentElement;
  root.dataset.reducedMotion = prefs.reducedMotion ? "1" : "";
  root.dataset.contrast = prefs.contrast ? "high" : "";
  root.style.fontSize = `${Math.round(prefs.textScale * 100)}%`;
}

function AppearanceSection() {
  const [themeState, setLocal] = useState(() => readThemeState());

  useEffect(() => {
    function onStorage(): void {
      setLocal(readThemeState());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setTheme(theme: Theme): void {
    const next = { ...themeState, theme };
    applyThemeState(next);
    setLocal(next);
  }
  function setMode(mode: Mode): void {
    const next = { ...themeState, mode };
    applyThemeState(next);
    setLocal(next);
  }

  const [a11y, setA11y] = useState(() => readA11yPrefs());
  const hc = a11y.contrast;
  const rm = a11y.reducedMotion;
  const lt = a11y.textScale > 1;
  const applyA11y = (
    patch: Partial<typeof a11y>,
  ) => {
    const next = { ...a11y, ...patch };
    setA11y(next);
    writeA11yPrefs(next);
  };
  const setHc = (v: boolean) => applyA11y({ contrast: v });
  const setRm = (v: boolean) => applyA11y({ reducedMotion: v });
  const setLt = (v: boolean) => applyA11y({ textScale: v ? 1.2 : 1 });

  return (
    <div style={{ maxWidth: 680 }}>
      <h2
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 24,
          margin: "0 0 4px",
        }}
      >
        Appearance
      </h2>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          margin: "0 0 22px",
        }}
      >
        Everything is a token. Pick a theme, or tune individual roles — the whole vault re-skins
        live.
      </p>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 12,
        }}
      >
        Theme
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <ThemeCard
          theme="base"
          label="Base"
          family="Cardo · neutral"
          swatches={["#15120D", "#C7A24C", "#ECE5D6"]}
          selected={themeState.theme === "base"}
          onClick={() => setTheme("base")}
        />
        <ThemeCard
          theme="hellenic"
          label="Hellenic"
          family="GFS Didot · bronze"
          swatches={["#0F1311", "#BFA15B", "#5E9BA6"]}
          selected={themeState.theme === "hellenic"}
          onClick={() => setTheme("hellenic")}
        />
        <ThemeCard
          theme="thelemic"
          label="Thelemic"
          family="Cinzel · gold/scarlet"
          swatches={["#100B09", "#CDA53E", "#C5392B"]}
          selected={themeState.theme === "thelemic"}
          onClick={() => setTheme("thelemic")}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 26,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
            width: 130,
          }}
        >
          Mode
        </div>
        <div
          style={{
            display: "flex",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md, 8px)",
            overflow: "hidden",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}
        >
          {(["dark", "light"] as Mode[]).map((m, i) => {
            const selected = themeState.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={selected}
                style={{
                  padding: "8px 16px",
                  fontFamily: "inherit",
                  color: selected ? "var(--ink)" : "var(--ink-soft)",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  borderLeft: i === 0 ? "none" : "1px solid var(--line)",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {m === "dark" ? "Dark" : "Light"}
              </button>
            );
          })}
          <button
            type="button"
            disabled
            style={{
              padding: "8px 16px",
              borderLeft: "1px solid var(--line)",
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              cursor: "not-allowed",
              fontFamily: "inherit",
            }}
            title="System auto-detection ships with prefers-color-scheme wiring."
          >
            Auto
          </button>
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
          Dark is the working default.
        </span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 12,
        }}
      >
        Font roles
      </div>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <FontRoleRow
          role="Display"
          family="Cardo"
          fontFamily="var(--font-display, var(--font-serif))"
          isLast={false}
        />
        <FontRoleRow
          role="Body / serif"
          family="Cardo"
          fontFamily="var(--font-serif)"
          isLast={false}
        />
        <FontRoleRow
          role="Interface"
          family="Inria Sans"
          fontFamily="var(--font-ui)"
          isLast={false}
        />
        <FontRoleRow
          role="Monospace"
          family="JetBrains Mono"
          fontFamily="var(--font-mono)"
          isLast={false}
        />
        <FontRoleRow
          role="Hebrew · per-script"
          family="Frank Ruhl Libre"
          fontFamily="var(--font-hebrew, var(--font-serif))"
          isLast={true}
        />
      </div>

      <h3
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 19,
          margin: "0 0 16px",
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
        }}
      >
        Language
      </h3>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
          margin: "0 0 16px",
        }}
      >
        Set the interface language. The catalog ships English, Modern Greek (Ελληνικά), and
        Hebrew (עברית); right-to-left scripts flip the layout automatically.
      </p>
      <div style={{ marginBottom: 28 }}>
        <LanguagePicker label="Interface language" />
      </div>

      <h3
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 19,
          margin: "0 0 16px",
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
        }}
      >
        Accessibility
      </h3>
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
        <AccessibilitySwitch
          label="High contrast"
          desc="Boosts text contrast beyond WCAG AAA."
          on={hc}
          onChange={setHc}
          topBorder={false}
        />
        <AccessibilitySwitch
          label="Reduced motion"
          desc="Stops the astrolabe, breathing timer, draw-ins."
          on={rm}
          onChange={setRm}
          topBorder={true}
        />
        <AccessibilitySwitch
          label="Larger text"
          desc="Scales the type ramp to 120%."
          on={lt}
          onChange={setLt}
          topBorder={true}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          lineHeight: 1.55,
        }}
      >
        For finer control (contrast levels · text-scale slider ·
        autoplay), open the dedicated{" "}
        <a href="/settings/accessibility" style={{ color: "var(--accent)" }}>
          Accessibility &amp; motion
        </a>{" "}
        page.
      </div>
    </div>
  );
}

// Sections that have a dedicated route on the admin nav — the
// subnav here just points to them so a practitioner following the
// design's expected layout still ends up on the real page.
const SECTION_HREF: Partial<Record<SectionKey, string>> = {
  account: "/settings",
  security: "/settings/sessions",
  networks: "/networks",
  plugins: "/plugins",
  accessibility: "/settings/accessibility",
  billing: "/pricing-distribution",
};

function StubSection({ section }: { section: SectionKey }) {
  const label = SECTIONS.find((s) => s.key === section)?.label ?? "Section";
  const href = SECTION_HREF[section];
  return (
    <div style={{ maxWidth: 680 }}>
      <h2
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 24,
          margin: "0 0 4px",
        }}
      >
        {label}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          margin: "0 0 22px",
        }}
      >
        The dedicated {label.toLowerCase()} surface lives at its own route.
      </p>
      {href ? (
        <a
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            textDecoration: "none",
          }}
        >
          Open {label} →
        </a>
      ) : (
        <div
          style={{
            padding: 24,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--bg-2)",
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink-mute)",
            textAlign: "center",
          }}
        >
          {label} controls will appear here once the underlying systems land.
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const [section, setSection] = useState<SectionKey>("appearance");
  useTopbar(
    () => ({
      title: "Settings",
      subtitle: "Appearance, security, networks & plugins",
    }),
    [],
  );

  return (
    <div style={{ margin: "0 -28px", display: "flex", minHeight: 0 }}>
      <Subnav active={section} onChange={setSection} />
      <main
        className="scroll"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          padding: "30px 34px",
        }}
      >
        {section === "appearance" ? <AppearanceSection /> : <StubSection section={section} />}
      </main>
    </div>
  );
}
