/**
 * PluginConfigurationSurface — H09 Cluster A surface 4.
 *
 * Faithful port of ``Theourgia Plugin Configuration.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Secret fields never show the existing value** — render
 *     `••••••••••••` + `[Reset]` (verbatim).
 *   * Verbatim intro: "These settings are declared by the
 *     plugin. Theourgia validates your input against the
 *     plugin's schema before saving."
 *   * Save uses `--accent`; Discard is the ghost — both
 *     standard, no `--danger`.
 *   * Helper text (per-field `description`) renders below the
 *     input in `--ink-mute`.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import {
  PCF_DISCARD_CTA,
  PCF_INTRO,
  PCF_SAVE_CTA,
  PCF_SECRET_PLACEHOLDER,
  PCF_SECRET_RESET,
} from "./copy.js";

// ─── Field schemas ─────────────────────────────────────────────────

export interface ConfigEnumOption {
  value: string;
  label: string;
}

interface BaseField {
  key: string;
  label: string;
  description?: string;
  /** Helper text below the input. */
}

export type ConfigField =
  | (BaseField & { kind: "string"; defaultValue?: string })
  | (BaseField & { kind: "text"; defaultValue?: string })
  | (BaseField & {
      kind: "number";
      defaultValue?: number | string;
      min?: number;
      max?: number;
    })
  | (BaseField & { kind: "boolean"; defaultValue?: boolean })
  | (BaseField & {
      kind: "enum";
      defaultValue?: string;
      options: readonly ConfigEnumOption[];
    })
  | (BaseField & { kind: "secret"; hasValue: boolean })
  | (BaseField & { kind: "url"; defaultValue?: string });

export interface PluginConfigurationSurfaceProps {
  pluginName: string;
  fields: readonly ConfigField[];
  onSave?: (values: Record<string, unknown>) => void;
  onDiscard?: () => void;
  onBreadcrumbHome?: () => void;
  onResetSecret?: (key: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function PluginConfigurationSurface({
  pluginName,
  fields,
  onSave,
  onDiscard,
  onBreadcrumbHome,
  onResetSecret,
  className,
  style,
}: PluginConfigurationSurfaceProps) {
  const titleId = useId();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    seedValues(fields),
  );

  const set = (key: string, value: unknown) =>
    setValues((p) => ({ ...p, [key]: value }));

  return (
    <section
      data-surface="plugin-configuration"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={onBreadcrumbHome}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Plugins
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            id={titleId}
            data-field="plugin-name"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {pluginName}
          </span>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
            }}
          >
            Configure
          </span>
        </div>
      </header>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "26px 24px 36px",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <p
            data-field="intro"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
              lineHeight: 1.55,
              margin: "0 0 2px",
            }}
          >
            {PCF_INTRO}
          </p>
          {fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => set(field.key, v)}
              onResetSecret={() => onResetSecret?.(field.key)}
            />
          ))}
        </div>
      </div>

      <footer
        style={{
          padding: "13px 24px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            width: "100%",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onDiscard}
            data-action="discard"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {PCF_DISCARD_CTA}
          </button>
          <button
            type="button"
            onClick={() => onSave?.(values)}
            data-action="save"
            style={{
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
              cursor: "pointer",
            }}
          >
            {PCF_SAVE_CTA}
          </button>
        </div>
      </footer>
    </section>
  );
}

function seedValues(
  fields: readonly ConfigField[],
): Record<string, unknown> {
  const seed: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === "secret") {
      seed[f.key] = null;
      continue;
    }
    if ("defaultValue" in f) {
      seed[f.key] = (f as { defaultValue?: unknown }).defaultValue;
    }
  }
  return seed;
}

// ─── FieldRow ────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  onChange,
  onResetSecret,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: unknown) => void;
  onResetSecret: () => void;
}): ReactNode {
  const labelEl = (
    <label
      htmlFor={`field-${field.key}`}
      style={{
        display: "block",
        fontFamily: "var(--font-serif)",
        fontSize: 15,
        color: "var(--ink)",
        marginBottom: 6,
      }}
    >
      {field.label}
    </label>
  );
  const helperEl = field.description ? (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        color: "var(--ink-mute)",
        marginTop: 5,
      }}
    >
      {field.description}
    </div>
  ) : null;

  switch (field.kind) {
    case "string":
    case "url":
      return (
        <div data-field-kind={field.kind} data-field-key={field.key}>
          {labelEl}
          <input
            id={`field-${field.key}`}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.currentTarget.value)}
            data-input
            style={inputStyle(field.kind === "url")}
          />
          {helperEl}
        </div>
      );
    case "text":
      return (
        <div data-field-kind="text" data-field-key={field.key}>
          {labelEl}
          <textarea
            id={`field-${field.key}`}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.currentTarget.value)}
            data-input
            rows={4}
            style={{ ...inputStyle(false), resize: "vertical" }}
          />
          {helperEl}
        </div>
      );
    case "number":
      return (
        <div data-field-kind="number" data-field-key={field.key}>
          {labelEl}
          <input
            id={`field-${field.key}`}
            type="number"
            value={value as number | string | undefined ?? ""}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(e.currentTarget.value)}
            data-input
            style={{ ...inputStyle(true), width: 180 }}
          />
          {helperEl}
        </div>
      );
    case "boolean": {
      const on = !!value;
      return (
        <div data-field-kind="boolean" data-field-key={field.key}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => onChange(!on)}
              data-switch
              style={{
                position: "relative",
                width: 46,
                height: 26,
                borderRadius: 13,
                background: on ? "var(--accent)" : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on
                  ? "var(--accent)"
                  : "var(--line-2)",
                flex: "none",
                cursor: "pointer",
                transition: "background .18s ease",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 2,
                  left: on ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: on
                    ? "var(--accent-ink)"
                    : "var(--ink-mute)",
                  transition: "left .18s ease",
                }}
              />
            </button>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              {field.label}
            </span>
          </label>
          {field.description ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginTop: 6,
                paddingLeft: 50,
              }}
            >
              {field.description}
            </div>
          ) : null}
        </div>
      );
    }
    case "enum": {
      const current = (value as string | undefined) ?? field.defaultValue;
      return (
        <div data-field-kind="enum" data-field-key={field.key}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink)",
              marginBottom: 8,
            }}
          >
            {field.label}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
            role="radiogroup"
          >
            {field.options.map((opt) => {
              const on = current === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange(opt.value)}
                  data-enum-option={opt.value}
                  data-on={on}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    width: "100%",
                    padding: "11px 14px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on
                      ? "var(--accent)"
                      : "var(--line)",
                    borderRadius: "var(--r-md)",
                    background: on
                      ? "var(--accent-soft)"
                      : "var(--bg-2)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on
                        ? "var(--accent)"
                        : "var(--line-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    {on ? (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: "var(--accent)",
                        }}
                      />
                    ) : null}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {helperEl}
        </div>
      );
    }
    case "secret":
      return (
        <div data-field-kind="secret" data-field-key={field.key}>
          {labelEl}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <input
              type="password"
              value={PCF_SECRET_PLACEHOLDER}
              readOnly
              data-secret-placeholder
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-3)",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.1em",
              }}
            />
            <button
              type="button"
              onClick={onResetSecret}
              data-action="reset-secret"
              style={{
                padding: "9px 14px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                flex: "none",
                cursor: "pointer",
              }}
            >
              {PCF_SECRET_RESET}
            </button>
          </div>
          {helperEl}
        </div>
      );
    default:
      return null;
  }
}

function inputStyle(mono: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "10px 13px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
    borderRadius: "var(--r-md)",
    background: "var(--bg-2)",
    color: "var(--ink)",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-serif)",
    fontSize: mono ? 13.5 : 14.5,
  };
}
