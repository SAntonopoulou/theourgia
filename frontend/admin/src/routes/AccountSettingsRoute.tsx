/**
 * AccountSettings — H10 B1 admin route.
 *
 * Sectioned hub linking to B2-B7 + the existing Identity edit surfaces.
 * Inheritance toggle persists to localStorage; the executor-setup CTA
 * routes to /identities for v1 (the dedicated executor designation
 * surface lands when Digital Inheritance ships).
 *
 * The About metadata is sourced from import.meta.env (operator label),
 * the build-time VITE_THEOURGIA_VERSION (defaults to "0.x"), and the
 * canonical source link.
 *
 * Mounted at /settings.
 */

import {
  AccountSettingsCopy,
  AccountSettingsSurface,
  useAuth,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { appHref } from "../lib/appHref.js";

const INHERITANCE_KEY = "theourgia.inheritance.enabled";

// Practices sits first on the hub the Settings gear lands on — Sophia, 20 Aug:
// the toggles were unfindable, buried behind the /settings/preferences subnav
// while the gear goes to /settings. This makes "Settings → Practices" two
// obvious clicks, keeping it in settings as she asked.
const PRACTICE_SECTION = {
  key: "practices" as const,
  title: "Practices",
  sub: "Turn the built-in disciplines on or off — what appears on Today",
  links: [{ label: "Manage practices", href: appHref("/settings/practices") }],
};

// Packs live in Settings, as they do on the phone: a pack is what the app is
// furnished with, not a practice worked with, so it belongs beside the choices
// the packs themselves leave open — not in the practice sidebar.
const PACKS_SECTION = {
  key: "packs" as const,
  title: "Packs",
  sub: "Install and manage the packs that furnish your practice",
  links: [{ label: "Browse & install packs", href: appHref("/packs") }],
};

// The shared DEFAULT_SECTIONS carry raw absolute hrefs ("/settings/keys").
// Served under the /app basename those escape the SPA, so resolve every
// internal link through appHref() once at module scope.
const SECTIONS = [
  PRACTICE_SECTION,
  PACKS_SECTION,
  ...AccountSettingsCopy.DEFAULT_SECTIONS.map((section) => ({
    ...section,
    links: section.links.map((l) =>
      l.href.startsWith("/") ? { ...l, href: appHref(l.href) } : l,
    ),
  })),
];

export function AccountSettingsRoute() {
  useTopbar(() => ({
    title: "Settings",
    subtitle: "Your account, your privacy, your access",
  }));

  const [inheritanceOn, setInheritanceOn] = useState(false);

  useEffect(() => {
    try {
      setInheritanceOn(localStorage.getItem(INHERITANCE_KEY) === "1");
    } catch {
      // localStorage may be unavailable (private mode); silently default off.
    }
  }, []);

  const auth = useAuth();
  const navigate = useNavigate();

  // Operator is whoever is signed in on this self-hosted instance
  // (the "operator" IS the vault owner). Falls back to a generic
  // label when no session is available (e.g. first-run wizard).
  const operator =
    auth.session?.display_name || auth.session?.magickal_name || "This instance";

  const about = {
    operator,
    version: import.meta.env.VITE_THEOURGIA_VERSION ?? "0.x",
    sourceLabel: "github.com/SAntonopoulou/theourgia",
    sourceHref: "https://github.com/SAntonopoulou/theourgia",
  };

  async function handleSignOut(): Promise<void> {
    try {
      await auth.signOut();
    } finally {
      navigate("/signin", { replace: true });
    }
  }

  return (
    <>
      <AccountSettingsSurface
        about={about}
        sections={SECTIONS}
        inheritanceOn={inheritanceOn}
        onToggleInheritance={(next) => {
          setInheritanceOn(next);
          try {
            if (next) localStorage.setItem(INHERITANCE_KEY, "1");
            else localStorage.removeItem(INHERITANCE_KEY);
          } catch {
            // localStorage unavailable — toggle is in-memory only.
          }
        }}
        onSetupExecutor={() => {
          // For v1 the executor-designation flow lives in the Identities
          // surface; the dedicated wizard lands with Digital Inheritance.
          navigate("/identities");
        }}
      />
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "0 24px 56px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => void handleSignOut()}
          style={{
            padding: "9px 22px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
