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

import { type CSSProperties, useState } from "react";

import {
  type FeedPack,
  Toast,
  fetchPackFeed,
  fetchPackMbf,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

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
      {packs.map((pack) => {
        const isInstalled = installedSlugs.some((s) => slugMatches(s, pack.id));
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
              <div style={{ fontSize: 11.5, color: "var(--ink-faint, var(--ink-mute))" }}>
                v{pack.version} · {megabytes(pack.bytes)}
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
