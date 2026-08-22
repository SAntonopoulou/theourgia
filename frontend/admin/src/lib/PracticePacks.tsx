/**
 * PracticePacks — the packs that matter to one practice, installable where
 * the practice lives. The web mirror of the phone's PacksAction: every
 * practice screen there opens a sheet of ITS packs (a kinds filter over the
 * library), so nobody leaves the rite to go find the rite's pack. Here the
 * same filter runs over the feed's `pack:kind` / `pack:contains`, and
 * installing goes through the same bundles import as /packs — one Agrippa,
 * not two.
 *
 * Quiet by design: with nothing relevant to offer (or no feed), it renders
 * nothing. Installed packs stay listed with their mark, so "which packs feed
 * this page" has one answer in one place.
 */

import {
  type FeedPack,
  Toast,
  fetchPackFeed,
  fetchPackMbf,
  packOffersKind,
  useApiCall,
} from "@theourgia/shared";
import { useRef, useState } from "react";

import { apiMethods } from "../data/api.js";

function slugMatches(installedSlug: string, packId: string): boolean {
  return installedSlug === packId || installedSlug === packId.replaceAll(".", "-");
}

export interface PracticePacksProps {
  /** The phone's ModuleKind keys this surface draws from (`rite`, `sitting`…). */
  kinds: readonly string[];
  /** Called after a successful install, so adopt lists can refresh. */
  onInstalled?: () => void;
  /** Inside the library dialog: show only what is NOT yet installed, as a
   *  plain strip (installed packs are already speaking through the
   *  offerings themselves). Renders nothing when everything is in. */
  installedCollapsed?: boolean;
}

export function PracticePacks({ kinds, onInstalled, installedCollapsed }: PracticePacksProps) {
  const feed = useApiCall(() => fetchPackFeed());
  const installed = useApiCall((signal) => apiMethods.bundlesInstalled({ signal }));
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const relevant = (feed.data ?? []).filter((p) => packOffersKind(p, kinds));
  if (relevant.length === 0) return null;

  const installedSlugs = installed.data?.bundles.map((b) => b.slug) ?? [];
  const isInstalled = (pack: FeedPack): boolean =>
    justInstalled.has(pack.id) || installedSlugs.some((s) => slugMatches(s, pack.id));
  const toInstall = relevant.filter((p) => !isInstalled(p)).length;

  // In the library dialog: a plain strip of what is not yet installed —
  // nothing at all once everything relevant is in.
  if (installedCollapsed) {
    if (toInstall === 0 || installed.data === undefined) return null;
    return (
      <div
        style={{
          marginTop: 14,
          padding: "12px 16px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 10px)",
          background: "var(--bg-2)",
          display: "grid",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Packs not yet installed
        </span>
        {relevant
          .filter((p) => !isInstalled(p))
          .map((pack) => (
            <div key={pack.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {pack.title}
              </span>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void install(pack)}
                style={{
                  border: "1px solid var(--accent)",
                  borderRadius: 8,
                  padding: "4px 12px",
                  background: busyId === pack.id ? "var(--bg-2)" : "var(--accent-soft)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  cursor: busyId !== null ? "default" : "pointer",
                  flexShrink: 0,
                }}
              >
                {busyId === pack.id ? "Installing…" : "Install"}
              </button>
            </div>
          ))}
      </div>
    );
  }

  async function install(pack: FeedPack): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(pack.id);
    try {
      const file = await fetchPackMbf(pack);
      await apiMethods.bundlesImport(file);
      setJustInstalled((s) => new Set(s).add(pack.id));
      Toast.push({ tone: "success", title: `Installed ${pack.title}` });
      await installed.refresh();
      onInstalled?.();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: `Couldn't install ${pack.title}`,
        body: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "12px 16px",
          border: "none",
          background: "transparent",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Packs for this practice
        </span>
        <span style={{ color: "var(--ink-mute)" }}>
          {toInstall > 0
            ? `${toInstall} to install · ${relevant.length - toInstall} installed`
            : `all ${relevant.length} installed`}
        </span>
        <span style={{ marginLeft: "auto", color: "var(--ink-mute)" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
          {relevant.map((pack) => (
            <div key={pack.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                {pack.title}
                <span
                  style={{
                    display: "block",
                    color: "var(--ink-mute)",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pack.description}
                </span>
              </span>
              {isInstalled(pack) ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--accent)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  ✓ Installed
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void install(pack)}
                  style={{
                    border: "1px solid var(--accent)",
                    borderRadius: 8,
                    padding: "5px 12px",
                    background: busyId === pack.id ? "var(--bg-2)" : "var(--accent-soft)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    cursor: busyId !== null ? "default" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {busyId === pack.id ? "Installing…" : "Install"}
                </button>
              )}
            </div>
          ))}
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            The same packs the phone installs. Once installed, what a pack offers this practice
            appears below under &ldquo;From installed packs&rdquo;.
          </p>
        </div>
      ) : null}
    </div>
  );
}
