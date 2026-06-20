/**
 * Today — the first real surface.
 *
 * Composes Avatar + CelestialBand + Stat tiles + a recent-entries Card
 * + a quick-capture button. Entries flow through the API client
 * (apiMethods.listEntries / createEntry), which resolves the fixture
 * store in mock mode or hits the backend in live mode — the surface
 * doesn't know which one is wired.
 */

import {
  Avatar,
  type AvatarIdentity,
  Button,
  Card,
  CelestialBand,
  EmptyState,
  type EntryRecord,
  Glyph,
  type GlyphName,
  PromptDialog,
  Skeleton,
  Stat,
  Toast,
  useSession,
} from "@theourgia/shared";
import { useState } from "react";

import { createEntry, useRecentEntries } from "../data/useEntries.js";
import { useTodayStats, weekOverWeekDelta } from "../data/useStats.js";
import { MOCK_IDENTITY, MOCK_LOCATION } from "../mocks/today.js";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

function relativeTime(at: string | Date): string {
  const ms = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function EntryRow({ entry }: { entry: EntryRecord }) {
  return (
    <article
      style={{
        display: "flex",
        gap: "var(--space-3, 12px)",
        padding: "var(--space-3, 12px) 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }}>
        <Glyph name={entry.glyph as GlyphName} size={18} />
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
            {relativeTime(entry.created_at)}
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

function EntriesSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={`skel-${i}`}
          style={{
            display: "flex",
            gap: "var(--space-3, 12px)",
            padding: "var(--space-3, 12px) 0",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Skeleton kind="circle" width={18} height={18} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton kind="text" width={180} />
            <Skeleton kind="text" width={320} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Today() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const entries = useRecentEntries();
  const stats = useTodayStats();
  const session = useSession();
  const identity: AvatarIdentity = session
    ? { name: session.display_name, glyph: "moon", tone: "accent" }
    : MOCK_IDENTITY;
  const greeting = greetingForHour(new Date().getHours());

  async function handleSubmit(value: string): Promise<void> {
    setCaptureOpen(false);
    try {
      await createEntry({
        title: value.slice(0, 64),
        type: "observation",
        excerpt: value,
        glyph: "feather",
      });
      Toast.push({ tone: "success", title: "Captured" });
      await Promise.all([entries.refresh(), stats.refresh()]);
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Could not capture",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

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
        <Avatar identity={identity} size="lg" />
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
            {identity.name}
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
        {stats.status === "loading" ? (
          <>
            <Card>
              <Skeleton kind="text" width={120} />
              <div style={{ height: 8 }} />
              <Skeleton kind="rect" width={80} height={28} />
            </Card>
            <Card>
              <Skeleton kind="text" width={120} />
              <div style={{ height: 8 }} />
              <Skeleton kind="rect" width={80} height={28} />
            </Card>
            <Card>
              <Skeleton kind="text" width={120} />
              <div style={{ height: 8 }} />
              <Skeleton kind="rect" width={80} height={28} />
            </Card>
          </>
        ) : stats.status === "error" || !stats.data ? (
          <Card>
            <Stat label="Stats unavailable" value="—" />
          </Card>
        ) : (
          <>
            <Card>
              <Stat
                label="Entries this week"
                value={stats.data.this_week.total}
                delta={weekOverWeekDelta(stats.data.this_week.total, stats.data.last_week.total)}
              />
            </Card>
            <Card>
              <Stat
                label="Synchronicities"
                value={stats.data.this_week.by_type.synchronicity}
                delta={weekOverWeekDelta(
                  stats.data.this_week.by_type.synchronicity,
                  stats.data.last_week.by_type.synchronicity,
                )}
              />
            </Card>
            <Card>
              <Stat
                label="Rites performed"
                value={stats.data.this_week.by_type.ritual}
                delta={weekOverWeekDelta(
                  stats.data.this_week.by_type.ritual,
                  stats.data.last_week.by_type.ritual,
                )}
              />
            </Card>
          </>
        )}
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
          <div style={{ display: "flex", gap: "var(--space-2, 8px)" }}>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => void entries.refresh()}
              aria-label="Refresh entries"
            >
              ↻
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setCaptureOpen(true)}
              iconStart="feather"
            >
              Quick capture
            </Button>
          </div>
        </div>

        {entries.status === "loading" ? (
          <EntriesSkeleton />
        ) : entries.status === "error" ? (
          <EmptyState
            glyph="lock"
            title="Couldn't load entries"
            body={entries.error?.message ?? "Unknown error fetching from the API."}
            action={
              <Button variant="secondary" onClick={() => void entries.refresh()}>
                Retry
              </Button>
            }
          />
        ) : entries.data && entries.data.length > 0 ? (
          <div>
            {entries.data.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
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
        )}
      </Card>

      <PromptDialog
        open={captureOpen}
        title="Quick capture"
        label="Observation"
        placeholder="What did you notice?"
        validate={(v) => (v.trim().length < 3 ? "A few words at least." : null)}
        confirmLabel="Capture"
        onSubmit={(value) => void handleSubmit(value)}
        onCancel={() => setCaptureOpen(false)}
      />
    </div>
  );
}
