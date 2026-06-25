/**
 * Talisman Designer — admin route wrapping the shared
 * TalismanDesignerSurface (H05 §E worked example).
 *
 * Two save paths:
 *   • Plaintext → POST /api/v1/talismans with full composition.
 *   • Sealed (Mode B) → POST plaintext first (with a placeholder
 *     composition the server immediately overwrites), then POST
 *     /seal with the ciphertext + IV produced client-side. The
 *     server nulls the plaintext columns and stores only the
 *     ciphertext envelope (salt embedded; passphrase stays on the
 *     practitioner's device).
 *
 * Backend contract (B104): /talismans creates a plaintext row;
 * /talismans/{id}/seal switches it into sealed mode. We do that in
 * two requests because there is no create-sealed endpoint yet.
 * The window between create + seal is short and within the same
 * authenticated session.
 */

import {
  type TalismanSavePayload,
  TalismanDesignerSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

const SEAL_PLACEHOLDER_FRONT = "<svg/>";
const SEAL_PLACEHOLDER_BACK = "<svg/>";

export function TalismanDesignerRoute() {
  useTopbar(
    () => ({
      title: "Talisman Designer",
      subtitle: "Compose a two-faced talisman from layered elements",
    }),
    [],
  );

  const handleSave = useCallback(async (payload: TalismanSavePayload) => {
    try {
      if (payload.sealed) {
        // Create plaintext placeholder, then immediately seal. The
        // placeholder front/back are minimal — the server nulls
        // them in the seal call.
        const created = await apiMethods.createTalisman({
          name: payload.title,
          purpose: payload.purpose,
          front_svg: SEAL_PLACEHOLDER_FRONT,
          back_svg: SEAL_PLACEHOLDER_BACK,
          components: {},
          materials_notes: payload.materials_notes || null,
          linked_election: payload.linked_election,
        });
        const sealed = await apiMethods.sealTalisman(created.id, {
          encrypted_payload_b64: payload.encrypted_payload_b64,
          encryption_iv_b64: payload.encryption_iv_b64,
        });
        Toast.push({
          tone: "success",
          title: "Sealed talisman saved",
          body: `“${sealed.name}” is now encrypted. The server only holds the ciphertext; your passphrase is the only way to unseal it.`,
        });
      } else {
        const row = await apiMethods.createTalisman({
          name: payload.title,
          purpose: payload.purpose,
          front_svg: payload.front_svg,
          back_svg: payload.back_svg,
          components: payload.components,
          materials_notes: payload.materials_notes || null,
          linked_election: payload.linked_election,
        });
        Toast.push({
          tone: "success",
          title: "Talisman saved",
          body: `“${row.name}” committed to your vault.`,
        });
      }
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Could not save",
        body:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred.",
      });
    }
  }, []);

  return <TalismanDesignerSurface onSave={handleSave} />;
}
