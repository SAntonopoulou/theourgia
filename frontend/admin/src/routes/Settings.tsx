/**
 * Settings — Phase 02 surface.
 *
 * Three sections wired to real substrate:
 *   - Identity: AuthContext (signin / signout + current session)
 *   - Theme & Display: design-system theme/mode/contrast/CVD axes
 *   - Location: per-user lat/lng via /api/v1/users/me/settings/location
 *
 * Future batches add: data export (GDPR), session management,
 * encryption mode, federation, plugins.
 */

import {
  Badge,
  Banner,
  Button,
  CONTRASTS,
  CVDS,
  Card,
  type Contrast,
  type Cvd,
  Field,
  MODES,
  type Mode,
  NumberInput,
  PromptDialog,
  SegmentedControl,
  Stat,
  StatusDot,
  Switch,
  THEMES,
  type Theme,
  Toast,
  applyThemeState,
  readThemeState,
  useAuth,
} from "@theourgia/shared";
import { useState } from "react";

import { putMyLocation, useMyLocation } from "../data/useLocation.js";

function Section({
  title,
  description,
  children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1, 4px)",
          marginBottom: "var(--space-3, 12px)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--type-h3, 18px)",
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-body-sm, 13px)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        {children}
      </div>
    </Card>
  );
}

function IdentitySection() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <Section
      title="Identity"
      description="Who you are when you author entries. WebAuthn registration replaces demo signin in a later batch."
    >
      {auth.status === "checking" ? (
        <StatusDot status="pending" label="Resolving session…" />
      ) : auth.status === "authenticated" && auth.session ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--type-caption, 11px)",
                  color: "var(--ink-mute)",
                }}
              >
                magickal name
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--type-body, 16px)",
                  color: "var(--ink)",
                }}
              >
                {auth.session.display_name}
              </span>
            </div>
            <Badge tone="success">authenticated</Badge>
          </div>
          <div>
            <Button variant="secondary" onClick={() => void auth.signOut()}>
              Sign out
            </Button>
          </div>
        </>
      ) : (
        <>
          <StatusDot status="neutral" label="No active session" />
          <div>
            <Button variant="primary" onClick={() => setOpen(true)}>
              Demo signin
            </Button>
          </div>
        </>
      )}
      <PromptDialog
        open={open}
        title="Demo signin"
        label="Magickal name"
        placeholder="Soror Ευ. Α."
        validate={(v) => (v.trim().length < 1 ? "A name is required." : null)}
        confirmLabel="Sign in"
        onSubmit={(value) => {
          setOpen(false);
          void auth.signInDemo({ magickal_name: value });
        }}
        onCancel={() => setOpen(false)}
      />
    </Section>
  );
}

const ThemeOptions: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "base", label: "Base" },
  { value: "hellenic", label: "Hellenic" },
  { value: "thelemic", label: "Thelemic" },
];

const ModeOptions: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

function ThemeSection() {
  const [state, setState] = useState(() => readThemeState());

  function update<K extends keyof typeof state>(key: K, value: (typeof state)[K]): void {
    const next = { ...state, [key]: value };
    setState(next);
    applyThemeState(next);
  }

  return (
    <Section
      title="Theme & display"
      description="Aesthetic preferences. Persisted to localStorage; user-settings sync lands when WebAuthn ships."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            color: "var(--ink-mute)",
          }}
        >
          THEME
        </span>
        <SegmentedControl
          options={ThemeOptions}
          value={state.theme}
          onChange={(v) => update("theme", v)}
          ariaLabel="Theme"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            color: "var(--ink-mute)",
          }}
        >
          MODE
        </span>
        <SegmentedControl
          options={ModeOptions}
          value={state.mode}
          onChange={(v) => update("mode", v)}
          ariaLabel="Mode"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            color: "var(--ink-mute)",
          }}
        >
          ACCESSIBILITY
        </span>
        <Switch
          checked={state.contrast === "high"}
          onChange={(checked) => update("contrast", (checked ? "high" : "normal") as Contrast)}
          label="High contrast"
        />
        <Switch
          checked={state.cvd === "safe"}
          onChange={(checked) => update("cvd", (checked ? "safe" : "normal") as Cvd)}
          label="Color-vision-deficiency palette"
        />
      </div>
      <div
        style={{
          marginTop: "var(--space-2, 8px)",
          paddingTop: "var(--space-3, 12px)",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: "var(--space-3, 12px)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--type-caption, 11px)",
          color: "var(--ink-mute)",
        }}
      >
        <span>theme={state.theme}</span>
        <span>mode={state.mode}</span>
        <span>contrast={state.contrast}</span>
        <span>cvd={state.cvd}</span>
        <span style={{ marginLeft: "auto" }}>
          (all axes: {THEMES.length}×{MODES.length}×{CONTRASTS.length}×{CVDS.length})
        </span>
      </div>
    </Section>
  );
}

function LocationSection() {
  const auth = useAuth();
  const isAuthed = auth.status === "authenticated";
  const locationCall = useMyLocation({ enabled: isAuthed });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync local fields with the fetched value once it arrives.
  if (locationCall.data && lat === null && lng === null) {
    setLat(locationCall.data.lat);
    setLng(locationCall.data.lng);
  }

  async function save(): Promise<void> {
    if (lat === null || lng === null) return;
    setSaving(true);
    try {
      await putMyLocation({ lat, lng });
      await locationCall.refresh();
      Toast.push({ tone: "success", title: "Location saved" });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Could not save location",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Location"
      description="The lat/lng CelestialBand uses to compute your planetary hour, sunrise, and sunset. Greenwich by default."
    >
      {!isAuthed ? (
        <Banner
          tone="info"
          title="Sign in to set your location"
          body="Without a session, CelestialBand falls back to Greenwich (51.4769° N, 0° E)."
        />
      ) : locationCall.status === "loading" ? (
        <StatusDot status="pending" label="Loading location…" />
      ) : locationCall.status === "error" ? (
        <StatusDot status="error" label={locationCall.error?.message ?? "Failed to load"} />
      ) : (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3, 12px)" }}
          >
            <Field label="Latitude" hint="-90 to 90">
              <NumberInput
                value={lat ?? ""}
                onChange={(e) => setLat(e.target.value === "" ? null : Number(e.target.value))}
                min={-90}
                max={90}
                step={0.0001}
              />
            </Field>
            <Field label="Longitude" hint="-180 to 180">
              <NumberInput
                value={lng ?? ""}
                onChange={(e) => setLng(e.target.value === "" ? null : Number(e.target.value))}
                min={-180}
                max={180}
                step={0.0001}
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2, 8px)", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => void save()} loading={saving}>
              Save
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setLat(51.4769);
                setLng(0);
              }}
            >
              Greenwich
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setLat(40.7128);
                setLng(-74.006);
              }}
            >
              New York
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setLat(35.6762);
                setLng(139.6503);
              }}
            >
              Tokyo
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

function StatsSection() {
  return (
    <Section title="Stack" description="Live status of the substrate behind this surface.">
      <div
        style={{
          display: "grid",
          gap: "var(--space-3, 12px)",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <Stat label="Frontend" value="Vite + React 19" />
        <Stat label="Backend" value="FastAPI + Postgres" />
        <Stat label="API" value="v1" />
      </div>
    </Section>
  );
}

export function Settings() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5, 24px)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Account · preferences
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--type-h1, 32px)",
            color: "var(--ink)",
          }}
        >
          Settings
        </h1>
      </header>

      <IdentitySection />
      <ThemeSection />
      <LocationSection />
      <StatsSection />
    </div>
  );
}
