/**
 * WebFingerVerifySurface — H08 §S3 Cluster B surface 19.
 *
 * Faithful port of ``Theourgia WebFinger Verification.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Failures never blame** (H08 rule 25). The fail subtitle
 *     is verbatim: "This is a configuration issue, not an error
 *     on your part."
 *
 *   * **Failures use `--warn` chrome** — NEVER `--danger`. A
 *     verification failure is a fixable misconfiguration, not a
 *     catastrophic state.
 *
 *   * **Pass shows the full key fingerprint** in `--font-mono`
 *     `--peer-ok` so the user can compare the wire form to the
 *     out-of-band channel.
 *
 *   * **Step-by-step (1 → 2 → 3)** makes the verification flow
 *     explicit. The step bullets activate as the practitioner
 *     progresses.
 *
 *   * The Run-Check button is disabled when the handle field is
 *     empty — verification refuses to fire on an absent input.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import {
  WFV_FAIL_LABEL_RESOLVE,
  WFV_FAIL_LABEL_WHAT,
  WFV_FAIL_RESOLUTION_STEPS,
  WFV_FAIL_DEFAULT_REASON_PREFIX,
  WFV_FAIL_SUBTITLE,
  WFV_FAIL_TITLE,
  WFV_IDLE_BODY,
  WFV_INTRO_HEAD,
  WFV_INTRO_PLACEHOLDER,
  WFV_INTRO_TAIL,
  WFV_LOADING_CTA,
  WFV_PASS_LABEL_ACTOR,
  WFV_PASS_LABEL_FINGERPRINT,
  WFV_PASS_SUBTITLE,
  WFV_PASS_TITLE,
  WFV_RESULT_HEADING,
  WFV_RUN_CTA,
  WFV_STEP1_LABEL,
  WFV_SUBTITLE,
  WFV_TITLE,
  type WfvPhase,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface WfvResultPass {
  outcome: "pass";
  /** Canonical AP actor URL the handle resolves to. */
  actorUrl: string;
  /** Human-readable fingerprint (e.g. SHA256 hex). */
  keyFingerprint: string;
}

export interface WfvResultFail {
  outcome: "fail";
  /** The host portion of the failed lookup (e.g. `instance.tld`). */
  instance: string;
}

export type WfvResult = WfvResultPass | WfvResultFail;

export interface WebFingerVerifySurfaceProps {
  /** Caller wires up the actual verification request. */
  onRunCheck: (handle: string) => Promise<WfvResult> | WfvResult;
  /** Initial handle to seed the input — useful when the route
   *  is opened with a query param. */
  initialHandle?: string;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "30px 24px 60px",
};

const STEP_NUM_BASE: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  background: "var(--bg-2)",
  color: "var(--ink-mute)",
};

const STEP_NUM_ACTIVE: CSSProperties = {
  ...STEP_NUM_BASE,
  borderColor: "var(--accent)",
  color: "var(--accent)",
  background: "var(--accent-soft)",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

// ─── Component ─────────────────────────────────────────────────────

export function WebFingerVerifySurface({
  onRunCheck,
  initialHandle = "",
  className,
  style,
}: WebFingerVerifySurfaceProps) {
  const titleId = useId();
  const [handle, setHandle] = useState(initialHandle);
  const [phase, setPhase] = useState<WfvPhase>("idle");
  const [result, setResult] = useState<WfvResult | null>(null);

  const runCheck = async () => {
    if (!handle || phase === "loading") return;
    setPhase("loading");
    try {
      const r = await onRunCheck(handle);
      setResult(r);
      setPhase("result");
    } catch {
      // The consumer is responsible for surfacing the error via
      // an external mechanism; here we fall back to a generic
      // fail card so the surface stays honest.
      const fallback: WfvResult = {
        outcome: "fail",
        instance:
          handle.split("@").slice(-1)[0] ?? "instance.tld",
      };
      setResult(fallback);
      setPhase("result");
    }
  };

  const idle = phase === "idle";
  const loading = phase === "loading";
  const showResult = phase === "result" && result !== null;

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="webfinger-verify"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {WFV_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {WFV_SUBTITLE}
          </div>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <p
            data-field="intro"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            {WFV_INTRO_HEAD}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--remote)",
              }}
            >
              {WFV_INTRO_PLACEHOLDER}
            </span>
            {WFV_INTRO_TAIL}
          </p>

          <Step
            num="1"
            active
            dataStep="1"
          >
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-display)",
                fontSize: 16,
                color: "var(--ink)",
                marginBottom: 9,
              }}
            >
              {WFV_STEP1_LABEL}
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.currentTarget.value)}
              placeholder={WFV_INTRO_PLACEHOLDER}
              data-field="handle-input"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 15,
              }}
            />
          </Step>

          <Step num="2" active={!!handle} dataStep="2">
            <div style={{ paddingTop: 5 }}>
              <button
                type="button"
                onClick={runCheck}
                disabled={loading || !handle}
                data-action="run-check"
                data-loading={loading}
                style={
                  loading
                    ? {
                        padding: "11px 20px",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-3)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        color: "var(--ink-soft)",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "wait",
                      }
                    : {
                        padding: "11px 22px",
                        borderRadius: "var(--r-md)",
                        background: "var(--accent)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: handle ? "pointer" : "not-allowed",
                        opacity: handle ? 1 : 0.5,
                      }
                }
              >
                {loading ? (
                  <>
                    <span
                      aria-hidden="true"
                      data-field="spinner"
                      style={{
                        display: "inline-block",
                        width: 15,
                        height: 15,
                        borderWidth: 2,
                        borderStyle: "solid",
                        borderColor: "currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "omSpin .7s linear infinite",
                        marginRight: 9,
                        verticalAlign: -2,
                      }}
                    />
                    {WFV_LOADING_CTA}
                  </>
                ) : (
                  WFV_RUN_CTA
                )}
              </button>
            </div>
          </Step>

          <Step num="3" active={showResult} dataStep="3">
            <div style={{ paddingTop: 5 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  color: showResult
                    ? "var(--ink)"
                    : "var(--ink-mute)",
                  marginBottom: 11,
                }}
              >
                {WFV_RESULT_HEADING}
              </div>
              {idle || loading ? (
                <IdleCard />
              ) : result?.outcome === "pass" ? (
                <PassCard result={result} />
              ) : result?.outcome === "fail" ? (
                <FailCard result={result} />
              ) : null}
            </div>
          </Step>
        </div>
      </main>
    </section>
  );
}

// ─── Step wrapper ────────────────────────────────────────────────

function Step({
  num,
  active,
  dataStep,
  children,
}: {
  num: string;
  active: boolean;
  dataStep: string;
  children: ReactNode;
}) {
  return (
    <div
      data-step={dataStep}
      data-active={active}
      style={{
        display: "flex",
        gap: 13,
        marginBottom: 18,
      }}
    >
      <div style={active ? STEP_NUM_ACTIVE : STEP_NUM_BASE}>
        {num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

// ─── Idle / Pass / Fail cards ────────────────────────────────────

function IdleCard() {
  return (
    <div
      data-field="result-idle"
      style={{
        padding: 20,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-md)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ink-mute)",
      }}
    >
      {WFV_IDLE_BODY}
    </div>
  );
}

function PassCard({ result }: { result: WfvResultPass }) {
  return (
    <div
      data-field="result-pass"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--peer-ok-border)",
        borderRadius: "var(--r-md)",
        background: "var(--peer-ok-soft)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--peer-ok)",
            flex: "none",
          }}
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.5 2.5L16 9" />
          </svg>
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {WFV_PASS_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {WFV_PASS_SUBTITLE}
          </div>
        </div>
      </header>
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        <div>
          <div style={SECTION_LABEL}>{WFV_PASS_LABEL_ACTOR}</div>
          <div
            data-field="pass-actor"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink)",
              wordBreak: "break-all",
            }}
          >
            {result.actorUrl}
          </div>
        </div>
        <div>
          <div style={SECTION_LABEL}>
            {WFV_PASS_LABEL_FINGERPRINT}
          </div>
          <div
            data-field="pass-fingerprint"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--peer-ok)",
            }}
          >
            {result.keyFingerprint}
          </div>
        </div>
      </div>
    </div>
  );
}

function FailCard({ result }: { result: WfvResultFail }) {
  return (
    <div
      data-field="result-fail"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--warn-border)",
        borderRadius: "var(--r-md)",
        background: "var(--warn-soft)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--warn)",
            flex: "none",
          }}
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {WFV_FAIL_TITLE}
          </div>
          <div
            data-field="fail-subtitle"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {WFV_FAIL_SUBTITLE}
          </div>
        </div>
      </header>
      <div style={{ padding: "14px 16px" }}>
        <div style={SECTION_LABEL}>{WFV_FAIL_LABEL_WHAT}</div>
        <div
          data-field="fail-what"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink)",
            marginBottom: 14,
          }}
        >
          {WFV_FAIL_DEFAULT_REASON_PREFIX}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--warn)",
            }}
          >
            {result.instance}/.well-known/webfinger
          </span>
          .
        </div>
        <div style={SECTION_LABEL}>{WFV_FAIL_LABEL_RESOLVE}</div>
        <ul
          data-field="fail-resolution-list"
          style={{
            margin: 0,
            paddingLeft: 18,
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
            lineHeight: 1.65,
          }}
        >
          {WFV_FAIL_RESOLUTION_STEPS.map(([head, tail], i) => (
            <li key={i}>
              {head}
              {head.endsWith("serves ") ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  /.well-known/webfinger
                </span>
              ) : null}
              {tail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
