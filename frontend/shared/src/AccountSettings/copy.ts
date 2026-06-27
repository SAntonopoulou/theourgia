/**
 * AccountSettings — H10 Cluster B1 surface (hub).
 *
 * Sectioned navigation hub that links to B2-B7. Rule 47 — Digital
 * Inheritance is opt-in at account creation; the words are real
 * ("executor," "memorial") not euphemism.
 */

export type SectionKey =
  | "identity"
  | "security"
  | "privacy"
  | "access"
  | "inheritance"
  | "lifecycle"
  | "about";

export interface SectionLink {
  label: string;
  href: string;
  /** Render in `--warn` (only used by the Delete your account link). */
  warn?: boolean;
}

export interface SectionDef {
  key: SectionKey;
  title: string;
  sub: string;
  links: readonly SectionLink[];
  /** Section is the inheritance toggle + setup CTA. */
  inheritance?: boolean;
  /** Section renders the operator/version/source dl. */
  about?: boolean;
}

export const DEFAULT_SECTIONS: readonly SectionDef[] = [
  {
    key: "identity",
    title: "Identity",
    sub: "Display name, magickal name, persona",
    links: [{ label: "Edit persona & magickal name", href: "#" }],
  },
  {
    key: "security",
    title: "Security",
    sub: "Keys, sessions, WebAuthn",
    links: [
      { label: "Signing keys & rotation", href: "/settings/keys" },
      { label: "Active sessions & devices", href: "/settings/sessions" },
      { label: "WebAuthn enrollment", href: "/settings/webauthn" },
    ],
  },
  {
    key: "privacy",
    title: "Privacy",
    sub: "Export & audit",
    links: [
      { label: "Export your vault", href: "/settings/data-export" },
      { label: "Your audit log", href: "/settings/audit" },
    ],
  },
  {
    key: "access",
    title: "Accessibility and motion",
    sub: "Contrast, text size, motion, autoplay",
    links: [
      { label: "Accessibility settings", href: "/settings/accessibility" },
    ],
  },
  {
    key: "inheritance",
    title: "Digital inheritance",
    sub: "Designate an executor for your vault",
    inheritance: true,
    links: [],
  },
  {
    key: "lifecycle",
    title: "Account lifecycle",
    sub: "Delete your account",
    links: [
      {
        label: "Delete your account",
        href: "/settings/delete-account",
        warn: true,
      },
    ],
  },
  {
    key: "about",
    title: "About this Theourgia instance",
    sub: "Operator, version, source",
    about: true,
    links: [],
  },
];

export const INHERITANCE_TOGGLE_LABEL = "Enable digital inheritance";
export const INHERITANCE_TOGGLE_HINT =
  "Designate an executor who can preserve your vault. Set it up calmly now, not at end of life.";
export const INHERITANCE_SETUP_CTA = "Set up executor & trigger";
