/**
 * WebFingerVerify · verbatim copy from H08
 * `Theourgia WebFinger Verification.dc.html`.
 *
 * Failure mode rules (rule 25): never blame the user — failures
 * are "a configuration issue, not an error on your part."
 */

export const WFV_TITLE = "Verify your Theourgia identity";
export const WFV_SUBTITLE =
  "Confirm that a Fediverse handle resolves to your vault";

export const WFV_INTRO_HEAD =
  "A WebFinger record ties a human-readable handle like ";
export const WFV_INTRO_PLACEHOLDER = "@you@instance.tld";
export const WFV_INTRO_TAIL =
  " to your vault's actor and signing key. Verifying confirms the link is sound before you publish it anywhere.";

export const WFV_STEP1_LABEL = "Paste a Fediverse handle to verify";
export const WFV_RUN_CTA = "Run check";
export const WFV_LOADING_CTA = "Querying WebFinger…";

export const WFV_RESULT_HEADING = "Result";
export const WFV_IDLE_BODY =
  "Run the check to see whether this handle resolves to your vault.";

/** Pass card. */
export const WFV_PASS_TITLE = "Verified";
export const WFV_PASS_SUBTITLE =
  "This handle resolves to your vault and the signing key matches.";
export const WFV_PASS_LABEL_ACTOR = "Resolved actor";
export const WFV_PASS_LABEL_FINGERPRINT = "Key fingerprint";

/** Fail card. */
export const WFV_FAIL_TITLE = "Not verified";
/** Verbatim — H08 rule 25, no blame. */
export const WFV_FAIL_SUBTITLE =
  "The handle did not resolve to your vault. This is a configuration issue, not an error on your part.";
export const WFV_FAIL_LABEL_WHAT = "What went wrong";
export const WFV_FAIL_LABEL_RESOLVE = "To resolve it";
export const WFV_FAIL_DEFAULT_REASON_PREFIX =
  "No WebFinger record was found at ";
/** The 3 verbatim resolution steps. */
export const WFV_FAIL_RESOLUTION_STEPS: ReadonlyArray<readonly [string, string]> =
  [
    [
      "Confirm your instance serves ",
      " over HTTPS.",
    ],
    [
      "Check the handle's spelling — the part after the second @ must be the host serving the record.",
      "",
    ],
    [
      "If you host elsewhere, ensure a redirect points the record back to this vault.",
      "",
    ],
  ];

export type WfvPhase = "idle" | "loading" | "result";
export type WfvOutcome = "pass" | "fail";
