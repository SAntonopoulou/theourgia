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
  AccountSettingsSurface,
  useAuth,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const INHERITANCE_KEY = "theourgia.inheritance.enabled";

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
          window.location.href = "/identities";
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
