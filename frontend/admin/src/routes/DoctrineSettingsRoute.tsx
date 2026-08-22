/**
 * Astrological doctrine — the contested choices, chosen.
 *
 * Sophia's standing rule (the ledger in the phone repo's
 * ASTRO-DOCTRINE-DECISIONS.md): where the tradition genuinely holds two
 * opinions, the practitioner chooses between them; where it holds one, the
 * app implements the one. This surface offers exactly those choices — each
 * option honestly labelled with its source — and writes them to the synced
 * ``astro.doctrine`` setting the engine reads (`GET/PUT
 * /users/me/settings/astro-doctrine`). A change saves immediately,
 * optimistically, and rolls back with a toast if the write fails.
 */

import {
  type AstroDoctrineSettings,
  Button,
  EmptyState,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

type Choice<K extends string> = {
  value: K;
  label: string;
  detail: string;
};

const SOLAR_PHASE: Choice<AstroDoctrineSettings["solar_phase"]>[] = [
  {
    value: "paulus",
    label: "Paulus of Alexandria (ch. 14)",
    detail:
      "Under the beams within 15°, combust within 9°, extreme within 3°, the heart at 1° (Rhetorius' enkardios; Paulus' same-degree rule agrees to within a minute). The verbatim Hellenistic text.",
  },
  {
    value: "lilly1647",
    label: "William Lilly, 1647",
    detail:
      "17° under the beams, 8°30′ combust, 17′ cazimi — derived arithmetically from the Sun's aspect orb, not from visibility. In Lilly's own words: “I know many are against this opinion.”",
  },
  {
    value: "medievalUnattributed",
    label: "Medieval (unattributed)",
    detail:
      "The 12° combustion that circulates without a named ancient author; the heart at 16′ (al-Bīrūnī, al-Qabīsī, Bonatti). Offered honestly as what it is — it is not Hellenistic.",
  },
];

const PREDOMINATOR: Choice<AstroDoctrineSettings["predominator"]>[] = [
  {
    value: "valensWholeSign",
    label: "Valens — whole sign",
    detail: "The spine of the app's timing work, in the app's own house frame. 2nd century CE.",
  },
  {
    value: "porphyry",
    label: "Antiochus / Porphyry — whole sign",
    detail: "The earliest surviving statement of the procedure, 1st–3rd century CE.",
  },
  {
    value: "dorotheus",
    label: "Dorotheus — whole sign",
    detail: "Dorotheus of Sidon, 1st century CE.",
  },
  {
    value: "valensQuadrant",
    label: "Valens — quadrant",
    detail:
      "The same author under quadrant divisions. Two procedures naming the same point under different frames are not agreeing.",
  },
  {
    value: "ptolemy",
    label: "Ptolemy — equal, from 5° before the Ascendant",
    detail: "Ptolemy's own frame (Tetrabiblos); it reaches modern practice via Lilly.",
  },
  {
    value: "paulus",
    label: "Paulus of Alexandria",
    detail: "4th century CE.",
  },
];

const VOID_OF_COURSE: Choice<AstroDoctrineSettings["void_of_course"]>[] = [
  {
    value: "thirtyDegrees",
    label: "Within thirty degrees (Hellenistic)",
    detail:
      "Kenodromia: the Moon completes no exact configuration within its next 30° of travel, regardless of sign boundaries. Voids are rare under this reading — the rarity is the doctrine. Differs from what most software implements.",
  },
  {
    value: "signExit",
    label: "Before leaving the sign (later)",
    detail:
      "The familiar modern rule: void until the Moon perfects nothing more before leaving the sign.",
  },
];

const SATURN_DEGREES: Choice<"21" | "20">[] = [
  {
    value: "21",
    label: "21° Libra",
    detail: "The majority of Hellenistic sources (Brennan), and George's own Teucer quotation.",
  },
  {
    value: "20",
    label: "20° Libra",
    detail: "Paulus of Alexandria, via George's tables — her operative value.",
  },
];

const VENUS_DEGREES: Choice<"27" | "26">[] = [
  {
    value: "27",
    label: "27° Pisces",
    detail: "Near-unanimous across the sources.",
  },
  {
    value: "26",
    label: "26° Pisces",
    detail: "Porphyry's lone dissent; Brennan suspects a textual error. Recorded, not recommended.",
  },
];

const sectionCard: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "18px 20px",
  background: "var(--bg-2)",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display, var(--font-serif))",
  fontSize: 17,
  color: "var(--ink)",
};

const sectionSub: CSSProperties = {
  margin: "5px 0 12px",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  lineHeight: 1.55,
};

function ChoiceGroup<K extends string>({
  name,
  value,
  choices,
  onChoose,
  disabled,
}: {
  name: string;
  value: K;
  choices: Choice<K>[];
  onChoose: (next: K) => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "grid", gap: 6 }}>
      {choices.map((c) => {
        const active = c.value === value;
        return (
          <label
            key={c.value}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: "var(--r-md, 10px)",
              border: `1px solid ${active ? "var(--accent)" : "var(--line-2)"}`,
              background: active ? "var(--accent-soft, var(--bg-3))" : "transparent",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.7 : 1,
            }}
          >
            <input
              type="radio"
              name={name}
              checked={active}
              disabled={disabled}
              onChange={() => onChoose(c.value)}
              style={{ marginTop: 3, accentColor: "var(--accent)" }}
            />
            <span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {c.label}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 2,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                }}
              >
                {c.detail}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function DoctrineSettingsRoute() {
  useTopbar(
    () => ({
      title: "Astrological doctrine",
      subtitle: "Where the tradition holds two opinions, the choice is yours",
    }),
    [],
  );

  const query = useApiCall((signal) => apiMethods.getAstroDoctrine({ signal }));
  const [doc, setDoc] = useState<AstroDoctrineSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data && doc === null) setDoc(query.data);
  }, [query.data, doc]);

  function save(next: AstroDoctrineSettings): void {
    const previous = doc;
    setDoc(next);
    setSaving(true);
    apiMethods
      .putAstroDoctrine(next)
      .then((confirmed) => setDoc(confirmed))
      .catch((e) => {
        setDoc(previous);
        Toast.push({
          tone: "warning",
          title: "That choice didn't save",
          body: e instanceof Error ? e.message : "Check your connection and try again.",
        });
      })
      .finally(() => setSaving(false));
  }

  return (
    <section style={{ maxWidth: 680 }}>
      <header style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 24,
            color: "var(--ink)",
          }}
        >
          Astrological doctrine
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
          }}
        >
          Where the tradition genuinely holds two opinions, you choose between them here; where it
          holds one, the app implements the one. Every option is labelled with its source. Your
          choices are kept with your account and govern every surface that reads the sky.
        </p>
      </header>

      {doc === null ? (
        query.error ? (
          <EmptyState
            title="Couldn't load your doctrine choices"
            body={query.error.message}
            action={<Button onClick={() => query.refresh()}>Try again</Button>}
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} kind="rect" height={120} />
            ))}
          </div>
        )
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={sectionCard}>
            <h3 style={sectionTitle}>Solar phase — combustion</h3>
            <p style={sectionSub}>
              How close to the Sun a planet must stand to be under the beams, combust, and in the
              heart (cazimi).
            </p>
            <ChoiceGroup
              name="Solar phase"
              value={doc.solar_phase}
              choices={SOLAR_PHASE}
              disabled={saving}
              onChoose={(solar_phase) => save({ ...doc, solar_phase })}
            />
          </div>

          <div style={sectionCard}>
            <h3 style={sectionTitle}>The Predominator</h3>
            <p style={sectionSub}>
              Which procedure names the predominating luminary. Each option carries its house frame,
              because two procedures naming the same point under different divisions are not
              agreeing.
            </p>
            <ChoiceGroup
              name="Predominator"
              value={doc.predominator}
              choices={PREDOMINATOR}
              disabled={saving}
              onChoose={(predominator) => save({ ...doc, predominator })}
            />
          </div>

          <div style={sectionCard}>
            <h3 style={sectionTitle}>Exaltation degrees</h3>
            <p style={sectionSub}>
              The exaltation signs are unanimous and are not an option. Whether the specific degree
              is read as a refinement — and which attested degree, where the sources conflict — is
              yours to choose.
            </p>
            <ChoiceGroup
              name="Exaltation degrees"
              value={doc.exaltation_degrees}
              choices={[
                {
                  value: "signLevel",
                  label: "Sign-level",
                  detail:
                    "Most Hellenistic astrologers focus on the whole sign — the controlling metaphor is rank and office, not energy.",
                },
                {
                  value: "degree",
                  label: "By degree",
                  detail:
                    "Also mark a planet standing on the exaltation degree itself — the throne within the sign.",
                },
              ]}
              disabled={saving}
              onChoose={(exaltation_degrees) => save({ ...doc, exaltation_degrees })}
            />
            {doc.exaltation_degrees === "degree" ? (
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                <div>
                  <p style={{ ...sectionSub, margin: "0 0 8px", fontWeight: 600 }}>
                    Saturn's degree — a genuine conflict in the sources
                  </p>
                  <ChoiceGroup
                    name="Saturn's exaltation degree"
                    value={String(doc.saturn_exaltation_degree) as "21" | "20"}
                    choices={SATURN_DEGREES}
                    disabled={saving}
                    onChoose={(v) => save({ ...doc, saturn_exaltation_degree: Number(v) })}
                  />
                </div>
                <div>
                  <p style={{ ...sectionSub, margin: "0 0 8px", fontWeight: 600 }}>
                    Venus's degree — one lone dissent
                  </p>
                  <ChoiceGroup
                    name="Venus's exaltation degree"
                    value={String(doc.venus_exaltation_degree) as "27" | "26"}
                    choices={VENUS_DEGREES}
                    disabled={saving}
                    onChoose={(v) => save({ ...doc, venus_exaltation_degree: Number(v) })}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div style={sectionCard}>
            <h3 style={sectionTitle}>Maltreatment</h3>
            <p style={sectionSub}>
              Whether a malefic's sextile counts toward maltreatment. George admits the contest and
              still awards it in George's own worked charts; switching it off is the stricter
              reading.
            </p>
            <ChoiceGroup
              name="Maltreatment"
              value={doc.maltreatment_contested_sextile ? "count" : "strict"}
              choices={[
                {
                  value: "count",
                  label: "Count the contested sextile",
                  detail: "As George does in practice.",
                },
                {
                  value: "strict",
                  label: "Square, opposition and conjunction only",
                  detail: "The stricter reading of the sources.",
                },
              ]}
              disabled={saving}
              onChoose={(v) => save({ ...doc, maltreatment_contested_sextile: v === "count" })}
            />
          </div>

          <div style={sectionCard}>
            <h3 style={sectionTitle}>Void of course</h3>
            <p style={sectionSub}>
              Two genuinely different doctrines, not two orbs on one idea. The phone's engines and
              this site read the same choice, so no two surfaces can call the same Moon two
              different things.
            </p>
            <ChoiceGroup
              name="Void of course"
              value={doc.void_of_course}
              choices={VOID_OF_COURSE}
              disabled={saving}
              onChoose={(void_of_course) => save({ ...doc, void_of_course })}
            />
          </div>
        </div>
      )}
    </section>
  );
}
