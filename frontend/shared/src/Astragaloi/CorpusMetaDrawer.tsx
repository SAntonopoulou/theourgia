/**
 * CorpusMetaDrawer — honest display of the astragaloi corpus meta
 * block, VERBATIM. Provenance, the tetraktys-overlay disclosure, the
 * operator's open adjudications (caveats) and the gaps.
 *
 * The drawer renders exactly what ``GET /astragaloi/corpus/meta``
 * returns; nothing is summarised, repaired or reworded. An oracle that
 * hides its own uncertainty would be lying about what it is.
 */

import { Drawer } from "../Drawer/index.js";
import { Skeleton } from "../Skeleton/index.js";
import type { AstragaloiCorpusMeta } from "../api/types.js";
import { _ } from "../i18n/index.js";

export interface CorpusMetaDrawerProps {
  open: boolean;
  onClose: () => void;
  meta: AstragaloiCorpusMeta | null;
  loading?: boolean;
}

const HEAD: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "18px 0 8px",
};

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "var(--ink-soft)",
  margin: 0,
};

/** Gap lists render with their raw key as the label — verbatim keys,
 *  not prettified prose that could drift from the corpus. */
function GapEntry({ label, value }: { label: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div data-gap={label} style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
          {label}
        </div>
        <div style={{ ...BODY, fontFamily: "var(--font-mono)", fontSize: 12 }}>
          {value.map((v) => String(v)).join(" · ")}
        </div>
      </div>
    );
  }
  if (typeof value === "string") {
    return (
      <div data-gap={label} style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
          {label}
        </div>
        <p style={BODY}>{value}</p>
      </div>
    );
  }
  return null;
}

export function CorpusMetaDrawer({ open, onClose, meta, loading }: CorpusMetaDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={_("About this corpus")} width={420}>
      <div data-component="corpus-meta">
        {loading ? <Skeleton kind="text" width="70%" /> : null}
        {!loading && meta === null ? (
          <p style={BODY}>{_("The corpus meta could not be loaded.")}</p>
        ) : null}
        {meta ? (
          <>
            {typeof meta.title === "string" ? (
              <p style={{ ...BODY, color: "var(--ink)" }}>{meta.title}</p>
            ) : null}
            {typeof meta.assembled === "string" ? (
              <p style={{ ...BODY, fontSize: 12.5, marginTop: 6 }}>{meta.assembled}</p>
            ) : null}
            {typeof meta.mechanics === "string" ? (
              <>
                <div style={HEAD}>{_("Mechanics")}</div>
                <p style={BODY}>{meta.mechanics}</p>
              </>
            ) : null}
            {typeof meta.tetraktys_overlay === "string" ? (
              <>
                <div style={HEAD}>{_("Tetraktys overlay")}</div>
                <p style={BODY}>{meta.tetraktys_overlay}</p>
              </>
            ) : null}
            {Array.isArray(meta.caveats) && meta.caveats.length > 0 ? (
              <>
                <div style={HEAD}>{_("Open adjudications & caveats")}</div>
                <ul
                  data-caveats
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {meta.caveats.map((c) => (
                    <li key={c} style={BODY}>
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {meta.gaps && typeof meta.gaps === "object" ? (
              <>
                <div style={HEAD}>{_("Gaps")}</div>
                {Object.entries(meta.gaps)
                  .filter(([key]) => !key.endsWith("_count"))
                  .map(([key, value]) => (
                    <GapEntry key={key} label={key} value={value} />
                  ))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
