/**
 * Today — the first real surface.
 *
 * Composes Avatar + CelestialBand + Stat tiles + a recent-entries Card
 * + a quick-capture button. Mock data for now; replaced with API calls
 * when the client batch lands.
 */

import {
  Avatar,
  Button,
  Card,
  CelestialBand,
  EmptyState,
  Glyph,
  PromptDialog,
  Stat,
  Toast,
} from "@theourgia/shared";
import { useState } from "react";

import {
  MOCK_ENTRIES,
  MOCK_IDENTITY,
  MOCK_LOCATION,
  MOCK_STATS,
  type RecentEntry,
} from "../mocks/today.js";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

function relativeTime(at: Date): string {
  const diff = Date.now() - at.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function EntryRow({ entry }: { entry: RecentEntry }) {
  return (
    <article
      style={{
        display: "flex",
        gap: "var(--space-3, 12px)",
        padding: "var(--space-3, 12px) 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span
        style={{
          color: "var(--accent)",
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        <Glyph name={entry.glyph} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--type-body, 16px)",
              color: "var(--ink)",
            }}
          >
            {entry.title}
          </h3>
          <span
            style={{
              fontSize: "var(--type-caption, 11px)",
              color: "var(--ink-mute)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "nowrap",
            }}
          >
            {relativeTime(entry.at)}
          </span>
        </div>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "var(--type-body-sm, 14px)",
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {entry.excerpt}
        </p>
      </div>
    </article>
  );
}

export function Today() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6, 32px)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-4, 16px)" }}>
        <Avatar identity={MOCK_IDENTITY} size="lg" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "var(--type-caption, 11px)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-mute)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {greeting}
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--type-h1, 32px)",
              color: "var(--ink)",
            }}
          >
            {MOCK_IDENTITY.name}
          </h1>
        </div>
      </header>

      <CelestialBand lat={MOCK_LOCATION.lat} lng={MOCK_LOCATION.lng} />

      <section
        style={{
          display: "grid",
          gap: "var(--space-4, 16px)",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <Card>
          <Stat
            label="Entries this week"
            value={MOCK_STATS.entriesThisWeek.value}
            delta={MOCK_STATS.entriesThisWeek.delta}
          />
        </Card>
        <Card>
          <Stat
            label="Synchronicities"
            value={MOCK_STATS.synchronicities.value}
            delta={MOCK_STATS.synchronicities.delta}
          />
        </Card>
        <Card>
          <Stat
            label="Rites performed"
            value={MOCK_STATS.ritesPerformed.value}
            delta={MOCK_STATS.ritesPerformed.delta}
          />
        </Card>
      </section>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
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
            Recent entries
          </h2>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => setCaptureOpen(true)}
            iconStart="feather"
          >
            Quick capture
          </Button>
        </div>
        {entries.length === 0 ? (
          <EmptyState
            glyph="journal"
            title="Nothing yet today"
            body="Open a fresh page and capture the first observation."
            action={
              <Button variant="primary" onClick={() => setCaptureOpen(true)}>
                Begin
              </Button>
            }
          />
        ) : (
          <div>
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
        {entries.length > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "var(--space-3, 12px)",
            }}
          >
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setEntries([]);
                Toast.push({
                  tone: "info",
                  title: "All entries archived",
                  body: "(demo only — mock data reset)",
                });
              }}
            >
              Reset (demo)
            </Button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "var(--space-3, 12px)",
            }}
          >
            <Button size="sm" variant="quiet" onClick={() => setEntries(MOCK_ENTRIES)}>
              Restore mock entries
            </Button>
          </div>
        )}
      </Card>

      <PromptDialog
        open={captureOpen}
        title="Quick capture"
        label="Observation"
        placeholder="What did you notice?"
        validate={(v) => (v.trim().length < 3 ? "A few words at least." : null)}
        confirmLabel="Capture"
        onSubmit={(value) => {
          setCaptureOpen(false);
          setEntries((prev) => [
            {
              id: String(Date.now()),
              title: value.slice(0, 64),
              type: "observation",
              glyph: "feather",
              at: new Date(),
              excerpt: value,
            },
            ...prev,
          ]);
          Toast.push({ tone: "success", title: "Captured" });
        }}
        onCancel={() => setCaptureOpen(false)}
      />
    </div>
  );
}
