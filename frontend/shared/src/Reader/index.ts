export { ReaderSurface } from "./ReaderSurface.js";
export type {
  ReaderPublicationRecord,
  ReaderPurchaseState,
  ReaderSiblingPublication,
  ReaderSurfaceProps,
} from "./ReaderSurface.js";
// PdfViewer + EpubViewer are lazy-loaded from inside ReaderSurface —
// see the lazy(...) at the top of ReaderSurface.tsx. They deliberately
// do NOT re-export here so importing anything from @theourgia/shared
// doesn't pull pdf.js / epub.js into the initial bundle.
