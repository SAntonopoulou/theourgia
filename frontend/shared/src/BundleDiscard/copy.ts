/**
 * BundleDiscard · verbatim copy from H09
 * `Theourgia Bundle Discard.dc.html`.
 *
 * (Despite the filename, this is the SANDBOX DISCARD modal —
 * surface 16 in the H09 onboarding. The bundle-vs-sandbox
 * distinction is in the surface body: sandbox-local rows are
 * deleted; main-vault references survive.)
 */

export const BDX_TITLE = "Discard sandbox?";

/** "{N} sandbox-local rows will be permanently deleted." */
export const BDX_DELETED_PREFIX_STRONG = " sandbox-local rows";
export const BDX_DELETED_SUFFIX = " will be permanently deleted.";

/** "{N} references already in your main vault will survive…" */
export const BDX_SURVIVE_PREFIX_STRONG =
  " references already in your main vault";
export const BDX_SURVIVE_SUFFIX =
  " will survive — they were copied when you used them, and remain after the sandbox is gone.";

export const BDX_CANCEL_CTA = "Not yet";
export const BDX_DISCARD_CTA = "Discard";
