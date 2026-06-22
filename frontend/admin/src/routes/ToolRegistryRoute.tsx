/**
 * Tool Registry — admin route wrapping the shared
 * ToolRegistrySurface. Phase 07 backend is unbuilt by design;
 * "New tool" / "New altar" emit a Toast.
 */

import {
  type RegistryView,
  ToolRegistrySurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function ToolRegistryRoute() {
  useTopbar(
    () => ({
      title: "Tool Registry",
      subtitle: "Your ritual implements and the altars they keep",
    }),
    [],
  );

  const handleNew = useCallback((view: RegistryView) => {
    Toast.push({
      tone: "info",
      title: view === "tools" ? "New tool" : "New altar",
      body: "Backend wiring (POST /api/v1/tools and /api/v1/altars) lands in a follow-up batch.",
    });
  }, []);

  return <ToolRegistrySurface onNew={handleNew} />;
}
