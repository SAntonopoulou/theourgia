/**
 * PackFeedRoute — admin route at ``/packs``.
 *
 * The browse-and-install surface for the pack feed (#87). Nothing on the web
 * read theourgia.com/packs/feed.xml before; this lists every published pack and
 * installs the chosen one through the existing bundles import — the same .mbf
 * the phone installs, so a web user and a phone user install the *same* Agrippa,
 * not two of them.
 *
 * Installing fetches the pack's bytes and hands them to ``bundlesImport``.
 * Whether each kind then *materializes* into usable content is the importer's
 * job (per-kind importers land alongside this); a kind with no importer yet
 * installs "listed but not materialized", and the card says so honestly.
 */

import { type CSSProperties, useEffect, useState } from "react";

import {
  type FeedPack,
  type RecordEntry,
  Toast,
  fetchPackFeed,
  fetchPackMbf,
  moduleInstallEntry,
  offeredFromOtherDevices,
  packSyncEnabled,
  parseModuleInstalls,
  setPackSyncEnabled,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { apiGet, apiPut } from "../lib/api.js";

const CARD: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  padding: "14px 16px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  marginBottom: 10,
};

const megabytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function slugMatches(installedSlug: string, packId: string): boolean {
  return installedSlug === packId || installedSlug === packId.replaceAll(".", "-");
}

export function PackFeedRoute() {
  useTopbar(() => ({ title: "Packs" }));

  const feed = useApiCall(() => fetchPackFeed());
  const installed = useApiCall((signal) => apiMethods.bundlesInstalled({ signal }));
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  async function install(pack: FeedPack): Promise<void> {
    setInstalling((s) => new Set(s).add(pack.id));
    try {
      const file = await fetchPackMbf(pack);
      const result = await apiMethods.bundlesImport(file);
      Toast.push({
        tone: "success",
        title: `Installed ${pack.title}`,
        body:
          result.imported > 0
            ? `${result.imported} of ${result.total} items imported.`
            : `Listed (${result.total} items) — this pack kind is stored but not yet materialized here.`,
      });
      await installed.refresh();
    } catch (cause) {
      Toast.push({
        tone: "error",
        title: `Couldn't install ${pack.title}`,
        body: cause instanceof Error ? cause.message : "Unknown error.",
      });
    } finally {
      setInstalling((s) => {
        const next = new Set(s);
        next.delete(pack.id);
        return next;
      });
    }
  }

  const [packSync, setPackSync] = useState<boolean>(() => packSyncEnabled(window.localStorage));
  // Pack ids another device on this account holds but this browser does not.
  const [phoneOffered, setPhoneOffered] = useState<Set<string>>(new Set());

  // Pack-install sync (opt-in, per-browser — a browser is a device, like the
  // phone). When on: advertise the packs this account holds so another device
  // can be offered them (web → phone), and read the facts other devices
  // advertised so their packs are badged here (phone → web). The pack never
  // travels, only the fact. Additive: a failure is "not now", never fatal.
  useEffect(() => {
    if (!packSync) return;
    const feedPacks = feed.data;
    const bundles = installed.data?.bundles;
    if (!feedPacks || !bundles) return;
    let cancelled = false;
    void (async () => {
      try {
        const slugs = bundles.map((b) => b.slug);
        const held = feedPacks.filter((p) => slugs.some((s) => slugMatches(s, p.id)));
        if (held.length > 0) {
          const now = new Date().toISOString();
          await apiPut("/record/entries", {
            entries: held.map((p) => moduleInstallEntry(p, now)),
          });
        }
        const all: RecordEntry[] = [];
        let since = 0;
        for (;;) {
          const page = await apiGet<{ entries: RecordEntry[]; next_since: number; more: boolean }>(
            `/record/entries?since=${since}&limit=500`,
          );
          all.push(...(page.entries ?? []));
          if (!page.more) break;
          since = page.next_since;
        }
        const feedIds = new Set(feedPacks.map((p) => p.id));
        const offered = offeredFromOtherDevices(parseModuleInstalls(all), slugs)
          .map((f) => f.id)
          .filter((id) => feedIds.has(id));
        if (!cancelled) setPhoneOffered(new Set(offered));
      } catch {
        // Not now — pack sync never blocks browsing or installing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packSync, feed.data, installed.data]);

  function toggleSync(): void {
    const next = !packSync;
    setPackSyncEnabled(next, window.localStorage);
    setPackSync(next);
    if (!next) setPhoneOffered(new Set());
  }

  if (feed.status === "loading") return <SurfaceSkeleton rowCount={6} />;
  if (feed.status === "error") {
    return (
      <SurfaceError
        title="Couldn't reach the pack feed."
        message={feed.error?.message ?? "Unknown error."}
        onRetry={() => void feed.refresh()}
      />
    );
  }

  const installedSlugs = installed.data?.bundles.map((b) => b.slug) ?? [];
  const packs = feed.data ?? [];

  return (
    <div style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto" }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-mute)",
          lineHeight: 1.6,
          margin: "0 0 18px",
        }}
      >
        Every pack theourgia publishes — the same {packs.length} you can install on the phone.
        Installing brings the pack here, under your account.
      </p>
      <label
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
          margin: "0 0 20px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={packSync}
          onChange={toggleSync}
          style={{ marginTop: 2, cursor: "pointer" }}
        />
        <span>
          Sync installed packs with your other devices. A pack installed on your phone is marked
          here to add, and the packs here are offered on your phone — only the fact travels, never
          the pack itself. Remembered on this browser alone; removing a pack here never removes it
          elsewhere.
        </span>
      </label>
      {packs.map((pack) => {
        const isInstalled = installedSlugs.some((s) => slugMatches(s, pack.id));
        const onAnotherDevice = !isInstalled && phoneOffered.has(pack.id);
        const busy = installing.has(pack.id);
        return (
          <div key={pack.id} style={CARD}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{pack.title}</div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                  margin: "4px 0 6px",
                }}
              >
                {pack.description}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-faint, var(--ink-mute))",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  v{pack.version} · {megabytes(pack.bytes)}
                </span>
                {onAnotherDevice && (
                  <span
                    style={{
                      color: "var(--accent)",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      padding: "1px 8px",
                    }}
                  >
                    on another device
                  </span>
                )}
              </div>
            </div>
            {isInstalled ? (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  alignSelf: "center",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Installed
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void install(pack)}
                style={{
                  alignSelf: "center",
                  padding: "8px 14px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--accent)",
                  background: busy ? "var(--bg-2)" : "var(--accent-soft)",
                  color: "var(--ink)",
                  fontSize: 13,
                  cursor: busy ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {busy ? "Installing…" : "Install"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
