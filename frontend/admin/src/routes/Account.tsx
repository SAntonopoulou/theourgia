/**
 * Account admin — Settings → Account (memberships / viewers / billing).
 *
 * Port of ``Theourgia Account.dc.html`` against the per-component ritual:
 *
 *   · `.dc.html` end-to-end (200-line subnav + 3 tab bodies)
 *   · `agent_onboarding.md §` Theourgia Account:
 *     - Network memberships — per-hub, which identity is presented,
 *       active/pending, leave (Confirm)
 *     - Private viewers — scoped ACL grants (teacher/executor/circle),
 *       grant (Prompt) and revoke (Confirm)
 *     - Billing — hosted-vault plan via Stripe, supporter payouts,
 *       invoices. **② from Stripe — never fake amounts.** Stubbed here
 *       until the Stripe substrate ships.
 *   · `agent_data_and_components.md` §1 — Private viewers are
 *     ``PrivateViewer`` ACL grants with ``scope ∈ {teacher, executor,
 *     circle, custom}``.
 *
 * Sibling links to other Settings sub-pages (Appearance & a11y,
 * Federation, Wellbeing) are real anchors — Federation + Wellbeing land
 * in Batch 16; Appearance is already in `/settings`.
 */

import { ConfirmDialog, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

type Tab = "memberships" | "viewers" | "billing";

interface MembershipRow {
  mark: string;
  name: string;
  role: string;
  identity: string;
  status: "Active" | "Pending";
}

interface ViewerRow {
  glyph: string;
  name: string;
  scope: string;
  since: string;
}

interface InvoiceRow {
  label: string;
  amount: string;
  date: string;
}

const MEMBERSHIPS: MembershipRow[] = [
  { mark: "Ω", name: "Ordo Theurgica", role: "III° · Hierophant", identity: "Theophrastos", status: "Active" },
  { mark: "✠", name: "O.T.O. — Sub Rosā Lodge", role: "V°", identity: "Frater Sub Rosā", status: "Active" },
  { mark: "H", name: "Hermetic Library Network", role: "Reader", identity: "Theophrastos", status: "Pending" },
];

const VIEWERS: ViewerRow[] = [
  { glyph: "Δ", name: "Demetra", scope: "Hellenic workings · read-only", since: "2 yr" },
  { glyph: "Θ", name: "My executor (sealed)", scope: "All, on inheritance trigger", since: "1 yr" },
  { glyph: "Ψ", name: "Psyche", scope: "Dream record only", since: "4 mo" },
];

const INVOICES: InvoiceRow[] = [
  { label: "Hosted vault · Practitioner", amount: "€6.00", date: "1 Jun" },
  { label: "Supporter payout", amount: "+€642.10", date: "1 Jun" },
  { label: "Hosted vault · Practitioner", amount: "€6.00", date: "1 May" },
];

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const base: CSSProperties = {
    textAlign: "left",
    padding: "9px 12px",
    borderRadius: "var(--r-sm)",
    fontFamily: "var(--font-ui)",
    fontSize: 13.5,
    color: active ? "var(--ink)" : "var(--ink-soft)",
    background: active ? "var(--accent-soft)" : "transparent",
    boxShadow: active ? "inset 2px 0 0 var(--accent)" : "none",
    border: "none",
    cursor: "pointer",
  };
  return (
    <button
      type="button"
      data-tab
      aria-pressed={active ? "true" : "false"}
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-2)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
        }
      }}
    >
      {label}
    </button>
  );
}

function SubnavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        textAlign: "left",
        padding: "9px 12px",
        borderRadius: "var(--r-sm)",
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        color: "var(--ink-mute)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-2)";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-mute)";
      }}
    >
      {label}
    </a>
  );
}

function MembershipsPanel({ onLeave }: { onLeave: (m: MembershipRow) => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 6px" }}>Network memberships</h2>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-soft)",
          margin: "0 0 22px",
        }}
      >
        The hubs and orders you belong to. Each sees only the identity you present to it.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MEMBERSHIPS.map((m) => (
          <div
            key={m.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
              padding: "16px 18px",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r-md)",
                background: "var(--accent-soft)",
                border: `1px solid ${LINE_2}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                color: "var(--accent)",
                fontSize: 17,
                flex: "none",
              }}
              aria-hidden="true"
            >
              {m.mark}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.1 }}>{m.name}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
                {m.role} · as {m.identity}
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: m.status === "Active" ? "var(--success)" : "var(--warning)",
                padding: "3px 11px",
                border: `1px solid ${LINE}`,
                borderRadius: 999,
                flex: "none",
              }}
            >
              {m.status}
            </span>
            <button
              type="button"
              onClick={() => onLeave(m)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                flex: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
              }}
            >
              Leave
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewersPanel({ onRevoke }: { onRevoke: (v: ViewerRow) => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 6px" }}>Private viewers</h2>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-soft)",
          margin: "0 0 22px",
        }}
      >
        People you have granted sight of otherwise-private entries — a teacher, a chosen heir, a trusted circle. Each
        grant is scoped and revocable.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
        {VIEWERS.map((v) => (
          <div
            key={v.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              padding: "14px 16px",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                border: `1px solid ${LINE_2}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-glyph)",
                color: "var(--accent)",
                fontSize: 15,
                flex: "none",
              }}
              aria-hidden="true"
            >
              {v.glyph}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, lineHeight: 1.1 }}>{v.name}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
                {v.scope}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", flex: "none" }}>
              {v.since}
            </span>
            <button
              type="button"
              onClick={() => onRevoke(v)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                flex: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
              }}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--accent)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Grant a viewer
      </button>
    </div>
  );
}

function BillingPanel() {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 6px" }}>Billing</h2>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-soft)",
          margin: "0 0 22px",
        }}
      >
        Theourgia is free to self-host. This covers the hosted vault and what you receive from supporters of your
        writing.
      </p>

      {/* current plan card */}
      <div
        style={{
          border: `1px solid ${LINE_2}`,
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: "18px 20px",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Hosted vault · Practitioner</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 2 }}>
              Renews 1 July 2026 · €6/month
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--success)",
              padding: "3px 11px",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
            }}
          >
            Active
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="1.4" aria-hidden="true">
            <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
            <path d="M2.5 9.5h19" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>···· 4242</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>via Stripe</span>
          <button
            type="button"
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            Update
          </button>
        </div>
      </div>

      {/* supporters */}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 11,
        }}
      >
        Supporters of the Almanac
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          padding: "16px 18px",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1 }}>214</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>supporters</div>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: LINE }} />
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1, color: "var(--success)" }}>€642</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>this month, after fees</div>
        </div>
        <a
          href="/analytics"
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--accent)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
          }}
        >
          Payouts →
        </a>
      </div>

      {/* invoices */}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 11,
        }}
      >
        Recent
      </div>
      <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", background: "var(--bg-2)", overflow: "hidden" }}>
        {INVOICES.map((iv, i) => (
          <div
            key={`${iv.label}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderBottom: i < INVOICES.length - 1 ? `1px solid ${LINE}` : "none",
            }}
          >
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink)", flex: 1 }}>{iv.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-soft)" }}>{iv.amount}</span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                width: 78,
                textAlign: "right",
              }}
            >
              {iv.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Account() {
  const [tab, setTab] = useState<Tab>("memberships");
  const [leaveTarget, setLeaveTarget] = useState<MembershipRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ViewerRow | null>(null);

  useTopbar(
    () => ({
      title: "Account",
      subtitle: "Settings",
    }),
    [],
  );

  return (
    <div
      className="om-acctgrid"
      style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: 0, minWidth: 0, flex: 1, margin: "0 -28px" }}
    >
      <nav
        className="om-acctnav"
        style={{
          borderRight: `1px solid ${LINE}`,
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TabButton label="Network memberships" active={tab === "memberships"} onClick={() => setTab("memberships")} />
        <TabButton label="Private viewers" active={tab === "viewers"} onClick={() => setTab("viewers")} />
        <TabButton label="Billing" active={tab === "billing"} onClick={() => setTab("billing")} />
        <div style={{ height: 1, background: LINE, margin: "8px 8px" }} />
        <SubnavLink href="/settings" label="Appearance & accessibility" />
        <SubnavLink href="/federation" label="Federation" />
        <SubnavLink href="/wellbeing" label="Wellbeing" />
      </nav>

      <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "28px 32px 60px" }}>
        <div style={{ maxWidth: 640 }}>
          {tab === "memberships" ? <MembershipsPanel onLeave={setLeaveTarget} /> : null}
          {tab === "viewers" ? <ViewersPanel onRevoke={setRevokeTarget} /> : null}
          {tab === "billing" ? <BillingPanel /> : null}
        </div>
      </main>

      <ConfirmDialog
        open={leaveTarget !== null}
        title={`Leave ${leaveTarget?.name ?? "hub"}?`}
        body="Your membership ends immediately. Past contributions stay attributed to you; you can be re-admitted by petition."
        confirmLabel="Leave"
        cancelLabel="Stay"
        tone="destructive"
        onConfirm={() => setLeaveTarget(null)}
        onCancel={() => setLeaveTarget(null)}
      />
      <ConfirmDialog
        open={revokeTarget !== null}
        title={`Revoke ${revokeTarget?.name ?? "viewer"}'s access?`}
        body="They will no longer be able to read the entries this grant covered. The grant can be reissued at any time."
        confirmLabel="Revoke access"
        cancelLabel="Keep"
        tone="destructive"
        onConfirm={() => setRevokeTarget(null)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
