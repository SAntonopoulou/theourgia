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
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

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

  const about = {
    operator: "Soror Ευ. Α.",
    version: import.meta.env.VITE_THEOURGIA_VERSION ?? "0.x",
    sourceLabel: "github.com/SAntonopoulou/theourgia",
    sourceHref: "https://github.com/SAntonopoulou/theourgia",
  };

  return (
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
  );
}
