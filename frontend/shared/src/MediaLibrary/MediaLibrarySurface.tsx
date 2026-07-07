/**
 * MediaLibrarySurface — H07 §S3 surface 14.
 *
 * Per-vault index of every media asset (images · audio · video ·
 * documents) plus a sealed-media count-only card.
 *
 * Honesty rules (H07 §S2.4 + §S2.5):
 *   • Sealed media surface as a single count-only `--seal-soft`
 *     placeholder card. NO thumbnails, NO names, NO metadata.
 *   • Type filter chips include "Sealed" — the practitioner can
 *     narrow to count-only entries without seeing content.
 *   • Per-asset link count is a quiet stat ("linked to N workings")
 *     using `--ink-mute`.
 *   • Duration badge on audio/video uses dark-on-light overlay,
 *     not a flashy colour.
 *   • "+ Upload" CTA hands off to the Upload modal — the surface
 *     itself never ingests files inline.
 */

import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type MediaKind = "image" | "audio" | "video" | "document";

export type MediaFilter =
  | "all"
  | "images"
  | "audio"
  | "video"
  | "documents"
  | "sealed";

export type MediaSort = "newest" | "oldest" | "largest";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  filename: string;
  /** Human-readable date + size, e.g. "15 Jun · 2.4 MB". */
  meta_label: string;
  /** Duration label for audio/video ("0:42", "4:18"). */
  duration_label?: string | null;
  /** Optional link-count copy ("linked to 2 workings"). */
  link_count_label?: string | null;
  /** Bytes — used by the "Largest" sort. */
  size_bytes: number;
  /** ISO timestamp — used by Newest/Oldest sort. */
  uploaded_at: string;
  /** Optional thumbnail URL. When absent, the surface renders a
   *  kind-specific glyph. */
  thumbnail_url?: string | null;
}

export interface MediaLibrarySurfaceProps {
  /** Plaintext assets. The surface filters + sorts these in-memory
   *  for the index view. Phase 11 backend will move the work
   *  server-side. */
  assets: readonly MediaAsset[];
  /** Total sealed-media count (count-only per the H07 rule). */
  sealed_count: number;
  onSelect?: (id: string) => void;
  /** Fired when the practitioner clicks the sealed placeholder. */
  onOpenSealed?: () => void;
  onUpload?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Filter + sort ──────────────────────────────────────────────────

const FILTER_LABELS: Record<MediaFilter, string> = {
  all: "All",
  images: "Images",
  audio: "Audio",
  video: "Video",
  documents: "Documents",
  sealed: "Sealed",
};

const FILTERS: MediaFilter[] = [
  "all",
  "images",
  "audio",
  "video",
  "documents",
  "sealed",
];

const SORT_LABELS: Record<MediaSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  largest: "Largest",
};

const SORTS: MediaSort[] = ["newest", "oldest", "largest"];

function filterAssets(
  assets: readonly MediaAsset[],
  filter: MediaFilter,
): readonly MediaAsset[] {
  if (filter === "all") return assets;
  // The "sealed" filter narrows to the count-only sealed card only —
  // plaintext assets fall out of the grid entirely.
  if (filter === "sealed") return [];
  const kind: MediaKind =
    filter === "images"
      ? "image"
      : filter === "audio"
        ? "audio"
        : filter === "video"
          ? "video"
          : "document";
  return assets.filter((a) => a.kind === kind);
}

function sortAssets(
  assets: readonly MediaAsset[],
  sort: MediaSort,
): MediaAsset[] {
  const copy = [...assets];
  if (sort === "newest") {
    copy.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  } else if (sort === "oldest") {
    copy.sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  } else if (sort === "largest") {
    copy.sort((a, b) => b.size_bytes - a.size_bytes);
  }
  return copy;
}

// ── Icons ─────────────────────────────────────────────────────────

const ICON_SIZE = 30;

function kindGlyph(kind: MediaKind): ReactElement {
  const s = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--ink-mute)",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "audio":
      return (
        <svg {...s}>
          <path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3" />
        </svg>
      );
    case "video":
      return (
        <svg {...s}>
          <rect x={3} y={6} width={18} height={12} rx={2} />
          <path d="M10 9l5 3-5 3z" />
        </svg>
      );
    case "document":
      return (
        <svg {...s}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 11h6M9 15h6" />
        </svg>
      );
    case "image":
    default:
      return (
        <svg {...s}>
          <rect x={4} y={5} width={16} height={14} rx={2} />
          <path d="M4 15l4-4 3 3 4-5 5 6" />
          <circle cx={9} cy={9} r={1.4} />
        </svg>
      );
  }
}

function SealedGlyph(): ReactElement {
  return (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
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
  );
}

function ChevronDown(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PlusIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "13px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const FILTER_ROW: CSSProperties = {
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

const SEARCH_WRAP: CSSProperties = {
  position: "relative",
  flex: "0 1 240px",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 24px 50px",
};

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 14,
  maxWidth: 1200,
};

const CARD_THUMB: CSSProperties = {
  aspectRatio: "1",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
};

// ── Surface ───────────────────────────────────────────────────────

export function MediaLibrarySurface({
  assets,
  sealed_count,
  onSelect,
  onOpenSealed,
  onUpload,
  className,
  style,
}: MediaLibrarySurfaceProps) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const filtered = filterAssets(assets, filter).filter((a) => {
      if (trimmed === "") return true;
      return (
        a.filename.toLowerCase().includes(trimmed) ||
        (a.link_count_label ?? "").toLowerCase().includes(trimmed)
      );
    });
    return sortAssets(filtered, sort);
  }, [assets, filter, sort, search]);

  // Sealed card visibility: shown on All + Sealed views when count > 0.
  const showSealedCard =
    (filter === "all" || filter === "sealed") && sealed_count > 0;

  return (
    <div
      data-component="media-library-surface"
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
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Media Library
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            The texture of practice — images, audio, video, documents.
          </div>
        </div>
        <button
          type="button"
          data-action="upload"
          onClick={onUpload}
          style={{
            marginLeft: "auto",
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
            border: "none",
            cursor: "pointer",
          }}
        >
          <PlusIcon />
          Upload
        </button>
      </header>

      {/* Filter + search + sort */}
      <div style={FILTER_ROW}>
        <div style={SEARCH_WRAP}>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-mute)",
            }}
          >
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions, alt-text, tags…"
            aria-label="Search media"
            data-ml-search
            style={{
              width: "100%",
              padding: "9px 12px 9px 33px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          />
        </div>

        <div
          className="scroll"
          role="group"
          aria-label="Type filter"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
            minWidth: 0,
          }}
        >
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                data-filter={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--accent)" : "var(--line)",
                  background: on ? "var(--accent-soft)" : "var(--bg-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: on ? "var(--ink)" : "var(--ink-mute)",
                  whiteSpace: "nowrap",
                  flex: "none",
                  cursor: "pointer",
                }}
              >
                {FILTER_LABELS[f]}
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative", flex: "none" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as MediaSort)}
            data-ml-sort
            aria-label="Sort"
            style={{
              padding: "8px 30px 8px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              appearance: "none",
            }}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--ink-mute)",
            }}
            aria-hidden="true"
          >
            <ChevronDown />
          </span>
        </div>
      </div>

      <div className="scroll" style={MAIN}>
        {visible.length === 0 && !showSealedCard ? (
          <div
            data-ml-empty
            style={{
              textAlign: "center",
              padding: "9vh 0",
              color: "var(--ink-mute)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                lineHeight: 1.6,
                margin: 0,
                color: "var(--ink-soft)",
              }}
            >
              No media here yet.
            </p>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                marginTop: 10,
              }}
            >
              Tap "+ Upload" to add images, audio, video, or documents.
            </p>
          </div>
        ) : (
          <div data-ml-grid style={GRID}>
            {visible.map((m) => {
              const cardBg =
                m.kind === "image"
                  ? "var(--bg-2)"
                  : "var(--bg-2)";
              const thumbBg =
                m.kind === "image"
                  ? "var(--bg-sunk)"
                  : "var(--bg-3)";
              const cardLink: ReactNode = m.thumbnail_url ? (
                <img
                  src={m.thumbnail_url}
                  alt={m.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    inset: 0,
                  }}
                />
              ) : (
                kindGlyph(m.kind)
              );
              return (
                <button
                  key={m.id}
                  type="button"
                  data-media-id={m.id}
                  data-media-kind={m.kind}
                  onClick={() => onSelect?.(m.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: cardBg,
                    overflow: "hidden",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div style={{ ...CARD_THUMB, background: thumbBg }}>
                    {cardLink}
                    {m.duration_label ? (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 7,
                          right: 7,
                          padding: "2px 7px",
                          borderRadius: "var(--r-sm)",
                          background: "rgba(0,0,0,.5)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "#fff",
                        }}
                      >
                        {m.duration_label}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ padding: "9px 11px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {m.filename}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                      }}
                    >
                      {m.meta_label}
                    </div>
                    {m.link_count_label ? (
                      <div
                        data-link-count
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          color: "var(--ink-mute)",
                          marginTop: 4,
                        }}
                      >
                        {m.link_count_label}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {showSealedCard ? (
              <button
                type="button"
                data-sealed-card
                onClick={onOpenSealed}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--seal-border)",
                  borderRadius: "var(--r-md)",
                  background: "var(--seal-soft)",
                  overflow: "hidden",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    ...CARD_THUMB,
                    background: "transparent",
                    color: "var(--seal)",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  <SealedGlyph />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      color: "var(--seal)",
                    }}
                  >
                    {sealed_count}{" "}
                    {sealed_count === 1 ? "file" : "files"}
                  </span>
                </div>
                <div style={{ padding: "9px 11px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink)",
                    }}
                  >
                    Sealed media
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--ink-mute)",
                      marginTop: 2,
                    }}
                  >
                    count only · unseal to view
                  </div>
                </div>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
