/**
 * First-run wizard — b108-2hf.
 *
 * FEATURES §12 · "Web-based first-run wizard — replace CLI + `.env`
 * with a signed-out setup surface". Renders when the vault has no
 * users yet (backend `/setup/status` returns `empty`). Guides the
 * new operator through a few gentle steps and then hands off to the
 * demo-signin endpoint to actually create the account + session.
 *
 * Steps (kept short by design — the whole flow reads as a welcome,
 * not a form gauntlet):
 *
 *   1. Welcome
 *   2. Choose your magickal name
 *   3. Choose a tradition preference (optional; stored as a nudge)
 *   4. Choose which calendars to display (optional; multi-select)
 *   5. Review + submit
 *
 * Traditions are informational — no schema for that preference yet.
 * Calendars persist (v1-016): after the account is created, the
 * selection is saved to the `calendars.enabled` user setting via
 * PUT /users/me/settings/calendars, and entry auto-stamps include
 * the chosen calendars from then on.
 */

import { useAuth } from "@theourgia/shared";
import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

const TRADITIONS = [
  "Hellenic",
  "Thelemic",
  "Hermetic",
  "Goetic",
  "Vedic",
  "Norse",
  "Egyptian",
  "Kabbalah",
  "Chaos",
  "Witchcraft",
  "Christian",
  "Other",
] as const;

// Exactly the calendars the backend registers (core/calendars/) —
// every checkbox here converts for real and lands in entry stamps.
const CALENDARS = [
  { key: "gregorian", label: "Gregorian" },
  { key: "julian", label: "Julian" },
  { key: "hebrew", label: "Hebrew" },
  { key: "thelemic", label: "Thelemic" },
  { key: "islamic", label: "Islamic (civil)" },
  { key: "coptic", label: "Coptic" },
  { key: "mayan", label: "Mayan" },
  { key: "french-republican", label: "French Republican" },
] as const;

type Step = 0 | 1 | 2 | 3 | 4;

interface Draft {
  magickalName: string;
  traditions: string[];
  calendars: string[];
}

export function SetupWizardRoute() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [status, setStatus] = useState<"checking" | "empty" | "provisioned">(
    "checking",
  );
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Draft>({
    magickalName: "",
    traditions: [],
    calendars: ["gregorian"],
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Detect provisioning state on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiClient.request<{
          state: "empty" | "provisioned";
        }>("/api/v1/setup/status");
        if (!cancelled) {
          setStatus(resp.state);
          if (resp.state === "provisioned") {
            // Vault already set up — send to sign-in.
            navigate("/signin", { replace: true });
          }
        }
      } catch {
        if (!cancelled) setStatus("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // If someone already has a session, don't render the wizard.
  useEffect(() => {
    if (auth.status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [auth.status, navigate]);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.request("/api/v1/auth/demo-signin", {
        method: "POST",
        json: { magickal_name: draft.magickalName.trim() },
      });
      // The auth cookie is now set — persist the calendar selection
      // (v1-016). Best-effort: a failed preference write must never
      // block the vault from opening; the same choice is editable in
      // Settings afterwards.
      try {
        await apiClient.request("/api/v1/users/me/settings/calendars", {
          method: "PUT",
          json: { enabled: draft.calendars },
        });
      } catch {
        // Preference write failed — the account exists; carry on.
      }
      // Force auth refresh + navigate.
      window.location.assign("/");
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Could not create your account. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];

  if (status === "checking") {
    return (
      <div style={pageStyle}>
        <p style={{ color: "var(--muted)" }}>Checking vault…</p>
      </div>
    );
  }

  return (
    <div style={pageStyle} data-route="setup-wizard">
      <div style={cardStyle}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-4)",
          }}
        >
          <h1
            style={{
              font: "var(--type-title)",
              margin: 0,
            }}
          >
            Welcome to Theourgia
          </h1>
          <span
            style={{
              font: "var(--type-caption)",
              color: "var(--muted)",
            }}
          >
            Step {step + 1} of 5
          </span>
        </header>

        {step === 0 && (
          <div>
            <p style={paragraph}>
              This is the first time this vault has been opened. A few
              short choices — nothing you can't change later — and then
              you're in.
            </p>
            <p style={paragraph}>
              Everything you record stays on this instance. The tools
              are yours; the practice is yours; the toolkit exists to
              stay out of the way.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <label style={{ display: "block", font: "var(--type-label)" }}>
              Your magickal name
              <input
                type="text"
                value={draft.magickalName}
                onChange={(e) =>
                  setDraft({ ...draft, magickalName: e.target.value })
                }
                placeholder="Soror Ευ. Α."
                autoFocus
                style={inputStyle}
              />
            </label>
            <p style={{ font: "var(--type-caption)", color: "var(--muted)" }}>
              Every entry, every rite, every attestation is signed with
              this name — not your legal identity.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={paragraph}>
              Which traditions inform your practice? (Multiple are fine —
              this is a nudge, not a lock.)
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: "var(--space-3)",
              }}
              data-role="tradition-chips"
            >
              {TRADITIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-active={draft.traditions.includes(t)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      traditions: toggle(draft.traditions, t),
                    })
                  }
                  style={chipStyle(draft.traditions.includes(t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={paragraph}>
              Which calendars should appear on your dashboard? Gregorian
              is on by default; add anything else you want to see side by
              side.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: "var(--space-3)",
              }}
              data-role="calendar-list"
            >
              {CALENDARS.map((c) => (
                <label
                  key={c.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    font: "var(--type-body)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.calendars.includes(c.key)}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        calendars: toggle(draft.calendars, c.key),
                      })
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p style={paragraph}>Ready. Here's what will be recorded:</p>
            <dl style={reviewList}>
              <dt style={reviewTerm}>Magickal name</dt>
              <dd style={reviewDetail}>{draft.magickalName}</dd>
              <dt style={reviewTerm}>Traditions</dt>
              <dd style={reviewDetail}>
                {draft.traditions.length
                  ? draft.traditions.join(", ")
                  : "none yet"}
              </dd>
              <dt style={reviewTerm}>Calendars</dt>
              <dd style={reviewDetail}>
                {draft.calendars
                  .map(
                    (k) => CALENDARS.find((c) => c.key === k)?.label ?? k,
                  )
                  .join(", ")}
              </dd>
            </dl>
            {error && (
              <p
                role="alert"
                style={{
                  color: "var(--care)",
                  marginTop: "var(--space-2)",
                }}
              >
                {error}
              </p>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: "var(--space-4)",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1) as Step)}
            disabled={step === 0}
            style={quietButton}
          >
            Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={
                step === 1 && draft.magickalName.trim().length < 1
              }
              style={primaryButton}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || draft.magickalName.trim().length < 1}
              style={primaryButton}
            >
              {submitting ? "Opening the vault…" : "Open the vault"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "84px 24px 56px",
};

const cardStyle: CSSProperties = {
  padding: "36px 32px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
};

const paragraph: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--ink)",
  marginBottom: "var(--space-2)",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 14px",
  marginTop: 4,
  marginBottom: 8,
  background: "var(--bg)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 15,
};

const primaryButton: CSSProperties = {
  padding: "10px 20px",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const quietButton: CSSProperties = {
  padding: "10px 20px",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const reviewList: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 4,
};

const reviewTerm: CSSProperties = {
  font: "var(--type-label)",
  color: "var(--muted)",
  margin: 0,
};

const reviewDetail: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--ink)",
  margin: 0,
};

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--bg)" : "var(--ink)",
    border: "1px solid var(--line-2)",
    borderRadius: "var(--r-pill)",
    cursor: "pointer",
    font: "var(--type-label)",
  };
}
