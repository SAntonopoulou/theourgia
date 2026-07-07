/**
 * MediaDetailSurface — H07 §S3 surface 15.
 *
 * Lightbox-style detail view for a single media asset. Three
 * viewer variants share the same metadata rail:
 *   • image  — lightbox image with prev/next + crop/rotate/adjust
 *   • audio  — waveform + transport + duration
 *   • video  — video element + duration overlay
 *
 * Honesty + H07 rules:
 *   • EXIF chip uses --info (informational), never --warn / --danger.
 *     If EXIF was stripped at upload, the chip reads "EXIF stripped"
 *     in --ink-mute — observational, not a warning.
 *   • Seal toggle defaults OFF. Switching ON does NOT delete the
 *     plaintext from view; it routes the next save through the
 *     vault key. The surface itself is a presentational shell —
 *     the route owns the actual seal/unseal action.
 *   • Linked-entity chips are quiet (--ink-soft + thin border).
 *   • "Insert into entry" is the primary CTA. The route owns the
 *     handoff back to the Tiptap editor; the surface only signals
 *     intent via onInsert.
 *   • No --danger anywhere on this surface.
 */

import {
  type CSSProperties,
  type ReactElement,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type MediaDetailKind = "image" | "audio" | "video" | "document";

export type ExifPolicy = "retained" | "stripped";

export interface MediaDetailLink {
  id: string;
  glyph: string;
  label: string;
}

export interface MediaDetailRecord {
  id: string;
  kind: MediaDetailKind;
  filename: string;
  /** Pixel dims for images, sample-rate label for audio, etc.
   *  Free-form short string from the backend. */
  dimensions_label: string;
  /** Free-form short string: mime + size, e.g. "image/jpeg · 2.4 MB". */
  type_size_label: string;
  /** EXIF policy reflects the upload-modal toggle for images. */
  exif_policy?: ExifPolicy;
  /** "EXIF retained · 15 Jun 22:41" / "EXIF stripped on upload". */
  exif_label?: string;
  alt_text: string;
  caption: string;
  tags: readonly string[];
  sealed: boolean;
  links: readonly MediaDetailLink[];
  /** Preview asset URLs. Optional — when absent the surface uses
   *  a glyph placeholder. */
  preview_url?: string | null;
  /** Duration label for audio/video ("0:42", "4:18"). */
  duration_label?: string | null;
}

export interface MediaDetailSurfaceProps {
  record: MediaDetailRecord;
  onBack?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onInsert?: () => void;
  onAltTextChange?: (text: string) => void;
  onCaptionChange?: (text: string) => void;
  onAddTag?: () => void;
  onRemoveTag?: (tag: string) => void;
  onToggleSeal?: (next: boolean) => void;
  onAddLink?: () => void;
  onRemoveLink?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Icons ─────────────────────────────────────────────────────────

function InsertIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 9h6" />
    </svg>
  );
}

function ChevronLeft(): ReactElement {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRight(): ReactElement {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function PlayIcon(): ReactElement {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l12-7z" />
    </svg>
  );
}

function PauseIcon(): ReactElement {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x={6} y={5} width={4} height={14} rx={1} />
      <rect x={14} y={5} width={4} height={14} rx={1} />
    </svg>
  );
}

function ClockGlyph(): ReactElement {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// ── Waveform stand-in (audio) ──────────────────────────────────────
// Twenty stylised columns. Real waveform extraction is a Phase 11
// backend job; the surface only renders the stand-in until peaks
// arrive on the record (a `peaks: readonly number[]` field will be
// added when the backend ships).

function Waveform(): ReactElement {
  const cols = 36;
  const peaks = Array.from(
    { length: cols },
    (_, i) => 0.35 + 0.65 * Math.abs(Math.sin((i + 1) * 1.7)),
  );
  return (
    <div
      data-waveform
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        height: 80,
        padding: "0 18px",
        width: "100%",
      }}
      aria-hidden="true"
    >
      {peaks.map((p, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 4,
            height: `${Math.round(p * 100)}%`,
            borderRadius: 2,
            background:
              i < cols * 0.4 ? "var(--accent)" : "var(--ink-mute)",
          }}
        />
      ))}
    </div>
  );
}

// ── Viewer variants ────────────────────────────────────────────────

function ImageViewer({
  record,
}: {
  record: MediaDetailRecord;
}): ReactElement {
  return (
    <div
      data-viewer-kind="image"
      style={{
        width: "min(560px, 100%)",
        aspectRatio: "4 / 3",
        borderRadius: "var(--r-md)",
        background: record.preview_url
          ? `center/cover no-repeat url(${record.preview_url})`
          : "radial-gradient(ellipse at 42% 36%, rgba(199,162,76,.22), #0c0a08 76%)",
        border: "1px solid var(--line-2)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 18,
        position: "relative",
      }}
    >
      {record.preview_url ? null : (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "rgba(236,229,214,.4)",
          }}
        >
          {record.alt_text || record.filename}
        </span>
      )}
    </div>
  );
}

function AudioViewer({
  record,
}: {
  record: MediaDetailRecord;
}): ReactElement {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      data-viewer-kind="audio"
      style={{
        width: "min(560px, 100%)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        border: "1px solid var(--line-2)",
        padding: "26px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Waveform />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
        }}
      >
        <button
          type="button"
          data-audio-toggle
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            cursor: "pointer",
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          {record.duration_label ?? "—:—"}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {record.filename}
        </div>
      </div>
    </div>
  );
}

function VideoViewer({
  record,
}: {
  record: MediaDetailRecord;
}): ReactElement {
  return (
    <div
      data-viewer-kind="video"
      style={{
        width: "min(640px, 100%)",
        aspectRatio: "16 / 9",
        borderRadius: "var(--r-md)",
        background: "#000",
        border: "1px solid var(--line-2)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {record.preview_url ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={record.preview_url}
          controls
          style={{ width: "100%", height: "100%", borderRadius: "var(--r-md)" }}
        />
      ) : (
        <div style={{ color: "var(--ink-mute)" }}>
          <PlayIcon />
        </div>
      )}
      {record.duration_label ? (
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            padding: "2px 7px",
            borderRadius: "var(--r-sm)",
            background: "rgba(0,0,0,.6)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#fff",
          }}
        >
          {record.duration_label}
        </span>
      ) : null}
    </div>
  );
}

function DocumentViewer({
  record,
}: {
  record: MediaDetailRecord;
}): ReactElement {
  return (
    <div
      data-viewer-kind="document"
      style={{
        width: "min(560px, 100%)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        border: "1px solid var(--line-2)",
        padding: "36px 28px",
        textAlign: "center",
        color: "var(--ink-mute)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          color: "var(--ink)",
          marginBottom: 6,
        }}
      >
        {record.filename}
      </div>
      <div>{record.type_size_label}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const SECTION_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

const TEXTAREA: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  lineHeight: 1.5,
  resize: "vertical",
  marginBottom: 14,
};

// ── Surface ───────────────────────────────────────────────────────

export function MediaDetailSurface({
  record,
  onBack,
  onPrev,
  onNext,
  onInsert,
  onAltTextChange,
  onCaptionChange,
  onAddTag,
  onRemoveTag,
  onToggleSeal,
  onAddLink,
  onRemoveLink,
  className,
  style,
}: MediaDetailSurfaceProps) {
  const exifIsRetained =
    record.exif_policy === "retained" && record.kind === "image";
  // EXIF chip tone: --info when retained (informational, not a
  // warning), --ink-mute when stripped (quiet observation).
  const exifColor = exifIsRetained ? "var(--info)" : "var(--ink-mute)";
  const exifBg = exifIsRetained ? "var(--info-soft)" : "var(--bg)";
  const exifLabel =
    record.exif_label ??
    (exifIsRetained ? "EXIF retained" : "EXIF stripped on upload");

  return (
    <div
      data-component="media-detail-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 22px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            data-back
            onClick={onBack}
            style={{
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Media Library
          </button>
          <span style={{ color: "var(--line-2)" }}>/</span>
          <span
            style={{
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {record.filename}
          </span>
        </nav>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            data-insert
            onClick={onInsert}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 12.5,
              border: "none",
              cursor: "pointer",
            }}
          >
            <InsertIcon />
            Insert into entry
          </button>
        </div>
      </header>

      <div
        className="md-cols"
        style={{
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Viewer */}
        <div
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            background: "var(--bg-sunk)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 30,
              position: "relative",
              minHeight: 340,
            }}
          >
            {onPrev ? (
              <button
                type="button"
                data-viewer-prev
                aria-label="Previous"
                onClick={onPrev}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid var(--line-2)",
                  background: "var(--bg-2)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft />
              </button>
            ) : null}

            {record.kind === "image" ? (
              <ImageViewer record={record} />
            ) : record.kind === "audio" ? (
              <AudioViewer record={record} />
            ) : record.kind === "video" ? (
              <VideoViewer record={record} />
            ) : (
              <DocumentViewer record={record} />
            )}

            {onNext ? (
              <button
                type="button"
                data-viewer-next
                aria-label="Next"
                onClick={onNext}
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid var(--line-2)",
                  background: "var(--bg-2)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronRight />
              </button>
            ) : null}
          </div>
        </div>

        {/* Metadata rail */}
        <aside
          className="scroll md-rail"
          style={{
            flex: "0 0 340px",
            borderLeft: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "20px 20px 30px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              marginBottom: 4,
            }}
          >
            {record.filename}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 18,
            }}
          >
            {record.dimensions_label} · {record.type_size_label}
          </div>

          {record.exif_label || record.exif_policy ? (
            <div
              data-exif-chip
              data-exif-policy={record.exif_policy ?? "stripped"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                border: `1px solid ${exifIsRetained ? "var(--info-soft)" : "var(--line)"}`,
                borderRadius: 20,
                background: exifBg,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: exifColor,
                marginBottom: 18,
              }}
            >
              <ClockGlyph />
              {exifLabel}
            </div>
          ) : null}

          <label data-field="alt" style={SECTION_LABEL}>
            Alt-text
          </label>
          <textarea
            data-alt-text
            rows={2}
            value={record.alt_text}
            onChange={(e) => onAltTextChange?.(e.target.value)}
            style={TEXTAREA}
          />

          <label data-field="caption" style={SECTION_LABEL}>
            Caption
          </label>
          <textarea
            data-caption
            rows={2}
            value={record.caption}
            onChange={(e) => onCaptionChange?.(e.target.value)}
            style={{ ...TEXTAREA, marginBottom: 16 }}
          />

          <div style={{ ...SECTION_LABEL, marginBottom: 8 }}>Tags</div>
          <div
            data-tags
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {record.tags.map((t) => (
              <button
                key={t}
                type="button"
                data-tag={t}
                onClick={() => onRemoveTag?.(t)}
                title={`Remove tag "${t}"`}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              data-tag-add
              onClick={onAddTag}
              style={{
                padding: "4px 11px",
                border: "1px dashed var(--line-2)",
                borderRadius: 20,
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                cursor: "pointer",
              }}
            >
              + add
            </button>
          </div>

          <label
            data-seal-toggle
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 13px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              cursor: "pointer",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 30,
                height: 17,
                borderRadius: 9,
                background: record.sealed
                  ? "var(--seal-soft)"
                  : "var(--bg-3)",
                border: `1px solid ${
                  record.sealed ? "var(--seal-border)" : "var(--line-2)"
                }`,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  left: record.sealed ? 14 : 1,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: record.sealed
                    ? "var(--seal)"
                    : "var(--ink-mute)",
                  transition: "left 0.18s ease",
                }}
              />
            </span>
            <input
              type="checkbox"
              checked={record.sealed}
              onChange={(e) => onToggleSeal?.(e.target.checked)}
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
              }}
              aria-label="Seal this media"
            />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              Seal this media
            </span>
          </label>

          <div
            style={{
              ...SECTION_LABEL,
              fontSize: 10.5,
              letterSpacing: ".14em",
              marginBottom: 10,
            }}
          >
            Linked
          </div>
          <div
            data-links
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {record.links.map((l) => (
              <button
                key={l.id}
                type="button"
                data-link-id={l.id}
                onClick={() => onRemoveLink?.(l.id)}
                title={`Unlink "${l.label}"`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  border: "1px solid var(--line-2)",
                  borderRadius: 20,
                  background: "transparent",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-glyph)",
                    color: "var(--accent)",
                  }}
                  aria-hidden="true"
                >
                  {l.glyph}
                </span>
                {l.label}
              </button>
            ))}
            <button
              type="button"
              data-link-add
              onClick={onAddLink}
              style={{
                padding: "4px 11px",
                border: "1px dashed var(--line-2)",
                borderRadius: 20,
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                cursor: "pointer",
              }}
            >
              + link
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
