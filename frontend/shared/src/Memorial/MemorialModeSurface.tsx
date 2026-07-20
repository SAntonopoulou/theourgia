/**
 * MemorialModeSurface — digital inheritance / memorial mode config.
 *
 * FEATURES §18 · "Digital inheritance / memorial mode".
 *
 * The surface has three parts: a status card that shows the current
 * state (active · warning · pending · memorialized), a check-in
 * button, and a settings form (cadence · executor contact · memorial
 * message · posthumous toggle). Every action is opt-in and reversible.
 *
 * Copy is deliberately warm and matter-of-fact — no urgency, no
 * countdown-doom, no fear language. This is a mortality-adjacent
 * surface; it should read as a friend helping you think ahead.
 */

import { type CSSProperties, useState } from "react";

export type MemorialState =
  | "active"
  | "warning"
  | "memorial_pending"
  | "memorialized";

/** Stored key-share summary — parameters only, never share material. */
export interface MemorialKeyShareInfo {
  n: number;
  k: number;
  created_at: string;
}

export interface MemorialConfig {
  id: string;
  owner_id: string;
  check_in_cadence_days: number;
  warning_window_days: number;
  last_check_in_at: string | null;
  executor_name: string | null;
  executor_email: string | null;
  memorial_message: string | null;
  posthumous_publications_enabled: boolean;
  memorialized_at: string | null;
  state: MemorialState;
  days_until_warning: number | null;
  days_until_pending: number | null;
  // v1-018 — optional so older fixtures keep validating.
  warning_notified_at?: string | null;
  executor_notified_at?: string | null;
  key_share?: MemorialKeyShareInfo | null;
}

export interface MemorialModeSurfaceProps {
  config: MemorialConfig;
  onCheckIn: () => void;
  onSave: (patch: Partial<MemorialConfig>) => void;
  onTrigger: () => void;
  onReactivate: () => void;
  /**
   * v1-018 — executor key-share. When provided, the executor section
   * gains the generation flow; when absent the section stays as the
   * plain contact fields (back-compat).
   */
  onGenerateKeyShare?: (input: {
    secret: string;
    shares: number;
    threshold: number;
  }) => void;
  /** Shares generated this session — displayed once, never stored. */
  generatedShares?: string[] | null;
  className?: string;
  style?: CSSProperties;
}

const STATE_HEADLINE: Record<MemorialState, string> = {
  active: "This vault is active",
  warning: "Time to check in soon",
  memorial_pending: "Check-in overdue",
  memorialized: "This vault is in memoriam",
};

const STATE_TONE: Record<MemorialState, string> = {
  active: "var(--accent)",
  warning: "var(--care)",
  memorial_pending: "var(--care)",
  memorialized: "var(--muted)",
};

export function MemorialModeSurface({
  config,
  onCheckIn,
  onSave,
  onTrigger,
  onReactivate,
  onGenerateKeyShare,
  generatedShares,
  className,
  style,
}: MemorialModeSurfaceProps) {
  const [cadence, setCadence] = useState<number>(config.check_in_cadence_days);
  const [warning, setWarning] = useState<number>(config.warning_window_days);
  const [executorName, setExecutorName] = useState<string>(
    config.executor_name ?? "",
  );
  const [executorEmail, setExecutorEmail] = useState<string>(
    config.executor_email ?? "",
  );
  const [message, setMessage] = useState<string>(
    config.memorial_message ?? "",
  );
  const [posthumous, setPosthumous] = useState<boolean>(
    config.posthumous_publications_enabled,
  );
  // v1-018 — key-share form state.
  const [keyShareSecret, setKeyShareSecret] = useState<string>("");
  const [keyShareCount, setKeyShareCount] = useState<number>(3);
  const [keyShareThreshold, setKeyShareThreshold] = useState<number>(2);

  const memorialized = config.state === "memorialized";

  const save = (): void => {
    onSave({
      check_in_cadence_days: cadence,
      warning_window_days: warning,
      executor_name: executorName || null,
      executor_email: executorEmail || null,
      memorial_message: message || null,
      posthumous_publications_enabled: posthumous,
    });
  };

  const humanLastCheckIn = config.last_check_in_at
    ? new Date(config.last_check_in_at).toLocaleDateString()
    : "not yet";

  return (
    <div
      className={className}
      data-component="memorial-mode"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        maxWidth: 720,
        ...style,
      }}
    >
      <section
        data-role="status"
        data-state={config.state}
        style={{
          padding: "var(--space-4)",
          border: "1px solid var(--line-2)",
          borderLeft: `4px solid ${STATE_TONE[config.state]}`,
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-2)",
        }}
      >
        <h2
          style={{
            font: "var(--type-title)",
            color: STATE_TONE[config.state],
            marginBottom: "var(--space-2)",
          }}
        >
          {STATE_HEADLINE[config.state]}
        </h2>
        <p style={{ marginBottom: "var(--space-2)" }}>
          Last check-in: <strong>{humanLastCheckIn}</strong>
        </p>
        {config.state === "active" &&
          config.days_until_warning !== null && (
            <p style={{ color: "var(--muted)" }}>
              About {config.days_until_warning} days until the next
              suggested check-in.
            </p>
          )}
        {config.state === "warning" &&
          config.days_until_pending !== null && (
            <p style={{ color: "var(--care)" }}>
              Consider checking in — the vault will enter memorial-
              pending state in about {config.days_until_pending} days
              if we don't hear from you.
            </p>
          )}
        {config.state === "memorial_pending" && (
          <p style={{ color: "var(--care)" }}>
            No check-in for a while. If you're here, a quick check-in
            resets everything.
          </p>
        )}
        {config.state === "memorialized" && (
          <p style={{ color: "var(--muted)" }}>
            The vault is currently a read-only in-memoriam surface. If
            you're the operator, you can reactivate below.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "var(--space-3)" }}>
          {!memorialized ? (
            <button
              type="button"
              onClick={onCheckIn}
              style={primaryButton}
              data-role="check-in"
            >
              I'm here
            </button>
          ) : (
            <button
              type="button"
              onClick={onReactivate}
              style={primaryButton}
              data-role="reactivate"
            >
              Reactivate vault
            </button>
          )}
        </div>
      </section>

      {!memorialized && (
        <section data-role="config">
          <h3
            style={{
              font: "var(--type-label)",
              color: "var(--muted)",
              marginBottom: "var(--space-2)",
            }}
          >
            Check-in schedule
          </h3>
          <label style={labelStyle}>
            Days between check-ins
            <input
              type="number"
              min={0}
              max={3650}
              value={cadence}
              onChange={(e) => setCadence(Number(e.target.value))}
              style={inputStyle}
            />
            <span style={hintStyle}>
              Zero disables the schedule entirely.
            </span>
          </label>
          <label style={labelStyle}>
            Warning window (days)
            <input
              type="number"
              min={0}
              max={3650}
              value={warning}
              onChange={(e) => setWarning(Number(e.target.value))}
              style={inputStyle}
            />
            <span style={hintStyle}>
              Once the cadence lapses, how long before memorial mode
              becomes pending.
            </span>
          </label>

          <h3
            style={{
              font: "var(--type-label)",
              color: "var(--muted)",
              marginTop: "var(--space-4)",
              marginBottom: "var(--space-2)",
            }}
          >
            Digital executor
          </h3>
          <label style={labelStyle}>
            Their name
            <input
              type="text"
              value={executorName}
              onChange={(e) => setExecutorName(e.target.value)}
              placeholder="e.g. a trusted friend or family member"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Their email
            <input
              type="email"
              value={executorEmail}
              onChange={(e) => setExecutorEmail(e.target.value)}
              placeholder="them@example.com"
              style={inputStyle}
            />
            <span style={hintStyle}>
              {onGenerateKeyShare
                ? "If memorial mode ever activates, this address " +
                  "receives a short factual notice with the guided steps."
                : "Cryptographic key-share for executor unlock lands in " +
                  "a future update. For now this is a contact field."}
            </span>
          </label>

          {onGenerateKeyShare && (
            <div data-role="key-share" style={{ marginTop: "var(--space-3)" }}>
              <h4
                style={{
                  font: "var(--type-label)",
                  color: "var(--ink)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Executor key-share
              </h4>
              <p style={{ ...hintStyle, marginBottom: "var(--space-2)" }}>
                Splits a secret you provide — your vault key material —
                into shares for your executor(s). The shares appear once
                and are never stored; only a fingerprint is kept so a
                recovery can be checked later.
              </p>
              {config.key_share && (
                <p
                  data-role="key-share-status"
                  style={{ ...hintStyle, marginBottom: "var(--space-2)" }}
                >
                  A key-share exists: {config.key_share.k} of{" "}
                  {config.key_share.n} shares recover the secret, created{" "}
                  {new Date(config.key_share.created_at).toLocaleDateString()}.
                  Generating again replaces it — shares already handed out
                  stop working.
                </p>
              )}
              <label style={labelStyle}>
                Secret to split
                <input
                  type="password"
                  value={keyShareSecret}
                  onChange={(e) => setKeyShareSecret(e.target.value)}
                  placeholder="Paste the vault key material here"
                  data-role="key-share-secret"
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  Not stored. It is split into shares in one step and
                  then discarded.
                </span>
              </label>
              <label style={labelStyle}>
                Shares to create
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={keyShareCount}
                  onChange={(e) => setKeyShareCount(Number(e.target.value))}
                  data-role="key-share-count"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Shares needed to recover
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={keyShareThreshold}
                  onChange={(e) =>
                    setKeyShareThreshold(Number(e.target.value))
                  }
                  data-role="key-share-threshold"
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  Two of three is a sensible default: no single share
                  opens anything, and one lost share is survivable.
                </span>
              </label>
              <button
                type="button"
                disabled={
                  !keyShareSecret ||
                  keyShareThreshold > keyShareCount ||
                  keyShareCount < 2 ||
                  keyShareThreshold < 2
                }
                onClick={() => {
                  onGenerateKeyShare({
                    secret: keyShareSecret,
                    shares: keyShareCount,
                    threshold: keyShareThreshold,
                  });
                  setKeyShareSecret("");
                }}
                style={primaryButton}
                data-role="generate-key-share"
              >
                Generate key-share
              </button>
              {generatedShares && generatedShares.length > 0 && (
                <div
                  data-role="generated-shares"
                  style={{
                    marginTop: "var(--space-3)",
                    padding: "var(--space-3)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-2)",
                  }}
                >
                  <p style={{ marginBottom: "var(--space-2)" }}>
                    These shares are shown once and never stored. Give
                    them to your executor(s) outside the app — paper in
                    a safe place works well.
                  </p>
                  <ol
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 12,
                      paddingLeft: "var(--space-4)",
                      wordBreak: "break-all",
                    }}
                  >
                    {generatedShares.map((share, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {share}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          <h3
            style={{
              font: "var(--type-label)",
              color: "var(--muted)",
              marginTop: "var(--space-4)",
              marginBottom: "var(--space-2)",
            }}
          >
            Memorial message
          </h3>
          <label style={labelStyle}>
            Public message shown when memorial mode activates
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Whatever you want visitors to see. Blank is fine — the vault is enough."
              style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: "var(--space-3)",
              font: "var(--type-body)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={posthumous}
              onChange={(e) => setPosthumous(e.target.checked)}
            />
            Auto-publish entries marked "publish on death" when memorial
            mode activates
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
            <button type="button" onClick={save} style={primaryButton}>
              Save settings
            </button>
            <button
              type="button"
              onClick={onTrigger}
              style={destructiveButton}
              data-role="trigger"
            >
              Enter memorial mode now
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "block",
  font: "var(--type-label)",
  color: "var(--ink)",
  marginBottom: "var(--space-2)",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-2)",
  marginTop: 4,
  marginBottom: 4,
  background: "var(--bg-2)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
};

const hintStyle: CSSProperties = {
  display: "block",
  font: "var(--type-caption)",
  color: "var(--muted)",
};

const primaryButton: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const destructiveButton: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "transparent",
  color: "var(--care)",
  border: "1px solid var(--care)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};
