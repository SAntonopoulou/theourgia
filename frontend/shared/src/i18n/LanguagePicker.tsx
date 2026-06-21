/**
 * LanguagePicker — small inline select for switching the active locale.
 *
 * Designed for the Account / Settings surface and as the toolbar option
 * on the public site. Renders every locale's *endonym* (the name in
 * its own language) so a user who only reads Ελληνικά or עברית can
 * still find their option.
 */

import type { CSSProperties } from "react";

import { useI18n } from "./I18nProvider.js";

export interface LanguagePickerProps {
  /** Visible label rendered before the select. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function LanguagePicker({ label, className, style }: LanguagePickerProps) {
  const { locale, available, setLocale } = useI18n();

  return (
    <label
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ink-soft)",
        ...style,
      }}
    >
      {label ? <span>{label}</span> : null}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          padding: "6px 10px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          color: "var(--ink)",
        }}
      >
        {available.map((meta) => (
          <option key={meta.locale} value={meta.locale}>
            {meta.name}
          </option>
        ))}
      </select>
    </label>
  );
}
