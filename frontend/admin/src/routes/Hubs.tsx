/**
 * Hubs — the federated-membership index.
 *
 * The design ships ``Theourgia Hub.dc.html`` as a single-hub *detail*
 * page (public chrome, hero, public rites, lineage, etc.). For the admin
 * sidebar's ``/hubs`` slot we render an **index** of hubs you belong to;
 * clicking a card will navigate to the hub-detail surface once that
 * route lands.
 *
 * All content is illustrative until federation + membership endpoints
 * arrive.
 */

import { useTopbar } from "@theourgia/shared";

interface HubSummary {
  slug: string;
  name: string;
  motto: string;
  current: string;
  founded: number;
  initiates: number;
  degrees: number;
  cadence: string;
  monogram: string;
  verified: boolean;
}

const HUBS: HubSummary[] = [
  {
    slug: "ordo-theurgica",
    name: "Ordo Theurgica",
    motto: "Ascensus per disciplinam.",
    current: "Hermetic order · Neoplatonic & Hellenic theurgic",
    founded: 2009,
    initiates: 47,
    degrees: 3,
    cadence: "Weekly network rites",
    monogram: "Θ",
    verified: true,
  },
  {
    slug: "isis-urania",
    name: "Isis-Urania",
    motto: "Sub umbra alarum tuarum.",
    current: "Golden Dawn temple · open monthly mass",
    founded: 1888,
    initiates: 22,
    degrees: 7,
    cadence: "Monthly Gnostic Mass",
    monogram: "✠",
    verified: true,
  },
  {
    slug: "sub-rosa-lodge",
    name: "Sub Rosā Lodge",
    motto: "Tace, age.",
    current: "Working group · banishing & lamen consecration",
    founded: 2018,
    initiates: 8,
    degrees: 1,
    cadence: "Dark-moon vigils",
    monogram: "✦",
    verified: false,
  },
];

function HubCard({ hub }: { hub: HubSummary }) {
  return (
    <article
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display, var(--font-serif))",
            color: "var(--accent)",
            fontSize: 22,
            flex: "none",
          }}
        >
          {hub.monogram}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 22,
              lineHeight: 1.1,
            }}
          >
            {hub.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-soft)",
              marginTop: 3,
            }}
          >
            {hub.motto}
          </div>
        </div>
        {hub.verified ? (
          <span
            title="Verified hub"
            aria-label="Verified hub"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-pill, 999px)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--success, var(--c-synchronicity))",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Verified
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        {hub.current}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        {[
          [hub.initiates.toString(), "Initiates"],
          [hub.degrees.toString(), "Degrees"],
          [hub.founded.toString(), "Founded"],
          [hub.cadence.split(" ")[0] ?? "—", "Cadence"],
        ].map(([value, label]) => (
          <div key={label} style={{ textAlign: "left" }}>
            <div
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          {hub.cadence}
        </span>
        <button
          type="button"
          disabled
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--accent)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "not-allowed",
            opacity: 0.7,
          }}
          title="Hub detail page ships with the federation surface."
        >
          Visit hub →
        </button>
      </div>
    </article>
  );
}

export function Hubs() {
  useTopbar(
    () => ({
      title: "Hubs",
      subtitle: `${HUBS.length} hubs · federation of orders, lodges, and working groups`,
    }),
    [],
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
        }}
      >
        {HUBS.map((hub) => (
          <HubCard key={hub.slug} hub={hub} />
        ))}
      </div>

      <div
        style={{
          marginTop: 26,
          padding: "16px 18px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink-mute)",
          textAlign: "center",
        }}
      >
        Federation discovery + hub-detail pages light up with the network
        publish endpoint.
      </div>
    </div>
  );
}
