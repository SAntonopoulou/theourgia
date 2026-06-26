/**
 * MediaUploadModal — H07 §S3 surface 16.
 *
 * Multi-phase modal for ingesting one-or-more media assets:
 *   1. Pick      — dropzone / file picker
 *   2. Configure — per-file alt-text + EXIF strip + location
 *                  precision + seal toggle
 *   3. Upload    — progress + outcome
 *
 * Honesty + H07 rules wired:
 *   • EXIF stripping defaults ON. The footnote frames it as a
 *     PRIVACY consideration ("removes metadata that could include
 *     location"), not a warning. Tone is --info, not --warn.
 *   • Missing alt-text uses --warn (and --warn-border around the
 *     input + card), never --danger. The copy reads:
 *       "Missing alt-text — upload can proceed, but a description
 *        helps everyone."
 *     Upload is NEVER gated on alt-text.
 *   • Location precision defaults to "drop entirely" — the most
 *     private option. Only shown when the file has location EXIF.
 *   • Seal defaults OFF. When ON, the route is expected to route
 *     the actual upload through B108 vaultCrypto; the modal
 *     itself only signals intent.
 *   • Cancel button never uses --danger.
 *   • Footer shows "N files · X MB" totals plus the primary
 *     Upload CTA that mirrors the file count.
 */

import {
  type CSSProperties,
  type DragEvent,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type UploadPhase = "pick" | "configure" | "upload";

export type LocationPrecision =
  | "drop"
  | "1km"
  | "10km"
  | "country"
  | "exact";

export const LOCATION_PRECISION_LABELS: Record<LocationPrecision, string> = {
  drop: "Location: drop entirely",
  "1km": "~1 km",
  "10km": "~10 km",
  country: "Country",
  exact: "Exact",
};

export type UploadFileKind = "image" | "audio" | "video" | "document";

export interface UploadFileDraft {
  id: string;
  filename: string;
  size_bytes: number;
  kind: UploadFileKind;
  /** Optional: a synchronous-derived preview URL (URL.createObjectURL). */
  preview_url?: string | null;
  alt_text: string;
  exif_strip: boolean;
  /** Whether the file claims location EXIF — only then is the
   *  precision picker shown. */
  has_location_exif: boolean;
  location_precision: LocationPrecision;
  seal: boolean;
}

export interface MediaUploadModalProps {
  open: boolean;
  initialFiles?: readonly UploadFileDraft[];
  onClose: () => void;
  onUpload: (files: readonly UploadFileDraft[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

const KIND_BY_MIME = (mime: string): UploadFileKind => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
};

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const draftFromFile = (file: File): UploadFileDraft => {
  const kind = KIND_BY_MIME(file.type);
  return {
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    filename: file.name,
    size_bytes: file.size,
    kind,
    preview_url:
      kind === "image" && typeof URL !== "undefined" && URL.createObjectURL
        ? URL.createObjectURL(file)
        : null,
    alt_text: "",
    exif_strip: true,
    // We can't actually inspect EXIF synchronously here. The route
    // can patch `has_location_exif` after a back-end probe; default
    // to false so the precision picker stays hidden.
    has_location_exif: false,
    location_precision: "drop",
    seal: false,
  };
};

// ── Icons ─────────────────────────────────────────────────────────

function InfoGlyph(): ReactElement {
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
      <circle cx={12} cy={12} r={9} />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function ImageGlyph(): ReactElement {
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
      <rect x={4} y={5} width={16} height={14} rx={2} />
      <path d="M4 15l4-4 3 3 4-5 5 6" />
      <circle cx={9} cy={9} r={1.3} />
    </svg>
  );
}

function AudioGlyph(): ReactElement {
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
      <path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3" />
    </svg>
  );
}

function VideoGlyph(): ReactElement {
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
      <rect x={3} y={6} width={18} height={12} rx={2} />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}

function DocumentGlyph(): ReactElement {
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
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

function CheckGlyph(): ReactElement {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent-ink)"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function kindIcon(kind: UploadFileKind): ReactElement {
  switch (kind) {
    case "audio":
      return <AudioGlyph />;
    case "video":
      return <VideoGlyph />;
    case "document":
      return <DocumentGlyph />;
    case "image":
    default:
      return <ImageGlyph />;
  }
}

// ── Styles ────────────────────────────────────────────────────────

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 80,
};

const DIALOG: CSSProperties = {
  width: "min(640px, calc(100vw - 24px))",
  maxHeight: "calc(100vh - 48px)",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 18px 60px rgba(0,0,0,.45)",
  overflow: "hidden",
};

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 22px",
  borderBottom: "1px solid var(--line)",
};

const BODY: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "18px 22px",
};

const FOOTER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 22px",
  borderTop: "1px solid var(--line)",
};

const checkbox = (on: boolean): CSSProperties => ({
  width: 16,
  height: 16,
  borderRadius: 4,
  border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
});

// ── Steps indicator ───────────────────────────────────────────────

function Steps({ phase }: { phase: UploadPhase }): ReactElement {
  const defs: { id: UploadPhase; label: string }[] = [
    { id: "pick", label: "Pick" },
    { id: "configure", label: "Configure" },
    { id: "upload", label: "Upload" },
  ];
  return (
    <div
      data-steps
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      {defs.map((d, i) => {
        const on = d.id === phase;
        return (
          <span
            key={d.id}
            data-step={d.id}
            data-step-on={on}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: on ? "var(--accent)" : "var(--bg-3)",
                color: on ? "var(--accent-ink)" : "var(--ink-mute)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: on ? "var(--ink)" : "var(--ink-mute)",
              }}
            >
              {d.label}
            </span>
            {i < defs.length - 1 ? (
              <span
                style={{
                  width: 14,
                  height: 1,
                  background: "var(--line-2)",
                  display: "inline-block",
                }}
                aria-hidden="true"
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function MediaUploadModal({
  open,
  initialFiles,
  onClose,
  onUpload,
}: MediaUploadModalProps) {
  const [files, setFiles] = useState<readonly UploadFileDraft[]>(
    initialFiles ?? [],
  );
  const [phase, setPhase] = useState<UploadPhase>(
    initialFiles && initialFiles.length > 0 ? "configure" : "pick",
  );
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalBytes = useMemo(
    () => files.reduce((acc, f) => acc + f.size_bytes, 0),
    [files],
  );

  const missingAltCount = useMemo(
    () =>
      files.filter((f) => f.kind === "image" && f.alt_text.trim() === "")
        .length,
    [files],
  );

  const updateFile = useCallback(
    (id: string, patch: Partial<UploadFileDraft>) => {
      setFiles((arr) =>
        arr.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((arr) => arr.filter((f) => f.id !== id));
  }, []);

  const handleNativePick = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const drafts = Array.from(list).map(draftFromFile);
      setFiles((arr) => [...arr, ...drafts]);
      setPhase("configure");
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleNativePick(e.dataTransfer.files);
    },
    [handleNativePick],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleUpload = useCallback(() => {
    setPhase("upload");
    setProgress(0);
    onUpload(files);
    // Fake a progress run for visual feedback; the route owns the
    // real upload. We don't fail on alt-text — the warn copy is
    // observational.
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / 1200) * 100));
      setProgress(p);
      if (p < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [files, onUpload]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload media"
      data-component="media-upload-modal"
      style={SCRIM}
    >
      <div style={DIALOG}>
        <div style={HEADER}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                lineHeight: 1.1,
              }}
            >
              Upload media
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              Images, audio, video, documents — keep what matters; strip
              what doesn't.
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Steps phase={phase} />
          </div>
        </div>

        <div style={BODY}>
          {phase === "pick" ? (
            <div
              data-upload-dropzone
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: "2px dashed var(--line-2)",
                borderRadius: "var(--r-md)",
                padding: "36px 20px",
                textAlign: "center",
                background: "var(--bg-2)",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                Drop files here, or click to pick
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                Multi-file upload — configure each on the next step.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleNativePick(e.target.files)}
                style={{ display: "none" }}
                data-upload-file-input
              />
            </div>
          ) : null}

          {phase === "configure" ? (
            <div data-upload-configure>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {files.map((f) => {
                  const missingAlt =
                    f.kind === "image" && f.alt_text.trim() === "";
                  const cardBorder = missingAlt
                    ? "var(--warn-border)"
                    : "var(--line)";
                  const inputBorder = missingAlt
                    ? "var(--warn-border)"
                    : "var(--line-2)";
                  return (
                    <div
                      key={f.id}
                      data-upload-file={f.id}
                      data-missing-alt={missingAlt}
                      style={{
                        display: "flex",
                        gap: 14,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "var(--r-sm)",
                          background:
                            f.kind === "image"
                              ? "radial-gradient(ellipse at 40% 35%, rgba(199,162,76,.18), var(--bg-sunk))"
                              : "var(--bg-3)",
                          border: "1px solid var(--line)",
                          flex: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--ink-mute)",
                        }}
                      >
                        {kindIcon(f.kind)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 13,
                              color: "var(--ink)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {f.filename}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flex: "none",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--ink-mute)",
                              }}
                            >
                              {formatBytes(f.size_bytes)}
                            </span>
                            <button
                              type="button"
                              data-remove-file
                              onClick={() => removeFile(f.id)}
                              aria-label={`Remove ${f.filename}`}
                              style={{
                                fontFamily: "var(--font-ui)",
                                fontSize: 11,
                                color: "var(--ink-mute)",
                                background: "transparent",
                                border: "1px solid var(--line-2)",
                                borderRadius: "var(--r-sm)",
                                padding: "2px 7px",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={f.alt_text}
                          onChange={(e) =>
                            updateFile(f.id, { alt_text: e.target.value })
                          }
                          placeholder="Alt-text (for images)"
                          data-alt-input
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: `1px solid ${inputBorder}`,
                            borderRadius: "var(--r-sm)",
                            background: "var(--bg)",
                            color: "var(--ink)",
                            fontFamily: "var(--font-serif)",
                            fontSize: 13,
                            marginBottom: 7,
                          }}
                        />
                        {missingAlt ? (
                          <div
                            data-missing-alt-warn
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 10.5,
                              color: "var(--warn)",
                              marginBottom: 7,
                            }}
                          >
                            Missing alt-text — upload can proceed, but a
                            description helps everyone.
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {f.kind === "image" ? (
                            <label
                              data-exif-toggle
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                fontFamily: "var(--font-ui)",
                                fontSize: 11.5,
                                color: "var(--ink-soft)",
                                cursor: "pointer",
                              }}
                            >
                              <span style={checkbox(f.exif_strip)}>
                                {f.exif_strip ? <CheckGlyph /> : null}
                              </span>
                              <input
                                type="checkbox"
                                checked={f.exif_strip}
                                onChange={(e) =>
                                  updateFile(f.id, {
                                    exif_strip: e.target.checked,
                                  })
                                }
                                style={{
                                  position: "absolute",
                                  opacity: 0,
                                  pointerEvents: "none",
                                }}
                                aria-label={`Strip EXIF on ${f.filename}`}
                              />
                              Strip EXIF
                            </label>
                          ) : null}

                          {f.kind === "image" && f.has_location_exif ? (
                            <div
                              data-location-precision
                              style={{ position: "relative" }}
                            >
                              <select
                                value={f.location_precision}
                                onChange={(e) =>
                                  updateFile(f.id, {
                                    location_precision: e.target
                                      .value as LocationPrecision,
                                  })
                                }
                                aria-label={`Location precision for ${f.filename}`}
                                style={{
                                  padding: "5px 26px 5px 10px",
                                  border: "1px solid var(--line-2)",
                                  borderRadius: "var(--r-sm)",
                                  background: "var(--bg)",
                                  color: "var(--ink-soft)",
                                  fontFamily: "var(--font-ui)",
                                  fontSize: 11.5,
                                  appearance: "none",
                                }}
                              >
                                {(
                                  [
                                    "drop",
                                    "1km",
                                    "10km",
                                    "country",
                                    "exact",
                                  ] as const
                                ).map((p) => (
                                  <option key={p} value={p}>
                                    {LOCATION_PRECISION_LABELS[p]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          <label
                            data-seal-toggle
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              fontFamily: "var(--font-ui)",
                              fontSize: 11.5,
                              color: "var(--ink-soft)",
                              cursor: "pointer",
                            }}
                          >
                            <span style={checkbox(f.seal)}>
                              {f.seal ? <CheckGlyph /> : null}
                            </span>
                            <input
                              type="checkbox"
                              checked={f.seal}
                              onChange={(e) =>
                                updateFile(f.id, { seal: e.target.checked })
                              }
                              style={{
                                position: "absolute",
                                opacity: 0,
                                pointerEvents: "none",
                              }}
                              aria-label={`Seal ${f.filename}`}
                            />
                            Seal
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                data-exif-default-note
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  margin: "14px 0 4px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    color: "var(--info)",
                    flex: "none",
                    marginTop: 1,
                  }}
                  aria-hidden="true"
                >
                  <InfoGlyph />
                </span>
                EXIF stripping is on by default — it removes metadata
                that could include location. Recommended for any image
                you may publish.
              </div>
            </div>
          ) : null}

          {phase === "upload" ? (
            <div
              data-upload-progress
              style={{ padding: "20px 0", textAlign: "center" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Uploading {files.length}{" "}
                {files.length === 1 ? "file" : "files"}…
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--bg-3)",
                  overflow: "hidden",
                  margin: "0 auto",
                  width: "70%",
                }}
              >
                <div
                  data-upload-progress-fill
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: "width .12s linear",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  marginTop: 10,
                }}
              >
                {progress}%
              </div>
            </div>
          ) : null}
        </div>

        <div style={FOOTER}>
          <span
            data-upload-totals
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
            {formatBytes(totalBytes)}
            {missingAltCount > 0 ? (
              <span
                data-upload-missing-alt-total
                style={{ marginLeft: 12, color: "var(--warn)" }}
              >
                · {missingAltCount} missing alt-text
              </span>
            ) : null}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              type="button"
              data-upload-cancel
              onClick={onClose}
              style={{
                padding: "11px 18px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-upload-submit
              onClick={handleUpload}
              disabled={files.length === 0 || phase === "upload"}
              style={{
                padding: "11px 20px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor:
                  files.length === 0 || phase === "upload"
                    ? "not-allowed"
                    : "pointer",
                opacity: files.length === 0 || phase === "upload" ? 0.55 : 1,
              }}
            >
              {phase === "upload"
                ? "Uploading…"
                : `Upload ${files.length} ${files.length === 1 ? "file" : "files"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
