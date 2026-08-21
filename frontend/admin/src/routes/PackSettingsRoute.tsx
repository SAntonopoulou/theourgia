/**
 * Pack settings — choose the contested conventions a pack leaves to you.
 *
 * The web parity for the phone's pack-options screen. A pack can declare
 * `options` (whether the iota subscript counts for ten; where a releasing
 * sequence resumes at the loosing of the bond), and this lets you choose among
 * them, across every installed pack at once. The choice is written to the synced
 * record (`data/packSettings`), so it crosses to the phone — nothing is chosen
 * until you choose it; before then the pack's own default stands.
 */

import { useQueryClient } from "@tanstack/react-query";
import { Button, Toast, chosenValue, useTopbar } from "@theourgia/shared";
import { useState } from "react";

import {
  MODULE_SETTINGS_KEY,
  setModuleChoice,
  useModuleSettings,
  usePackModuleOptions,
} from "../data/packSettings.js";

export function PackSettingsRoute() {
  useTopbar(
    () => ({ title: "Pack settings", subtitle: "The conventions your packs leave to you" }),
    [],
  );

  const qc = useQueryClient();
  const packsQuery = usePackModuleOptions();
  const settingsQuery = useModuleSettings();
  const packs = packsQuery.data ?? [];
  const settings = settingsQuery.data ?? new Map<string, string>();
  const [busy, setBusy] = useState(false);

  const choose = async (
    moduleId: string,
    optionKey: string,
    value: string | null,
  ): Promise<void> => {
    setBusy(true);
    try {
      await setModuleChoice({ moduleId, optionKey, value });
      await qc.invalidateQueries({ queryKey: MODULE_SETTINGS_KEY });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <p
        style={{
          margin: "0 0 22px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.55,
        }}
      >
        Some packs leave a genuinely contested choice to you. Make it here, and it holds across your
        devices. Until you choose, each pack's own default stands.
      </p>

      {packsQuery.isPending || settingsQuery.isPending ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : packs.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          None of your installed packs offer a choice. Options appear here when you install a pack
          that declares one.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 22 }}>
          {packs.map((pack) => (
            <div
              key={pack.moduleId}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                padding: 18,
                background: "var(--bg-2)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 4px",
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 18,
                  color: "var(--ink)",
                }}
              >
                {pack.moduleName}
              </h2>
              <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
                {pack.options.map((opt) => {
                  const current = chosenValue(settings, pack.moduleId, opt.key) ?? opt.byDefault;
                  const isDefault = current === opt.byDefault;
                  return (
                    <fieldset
                      key={opt.key}
                      style={{ border: "none", margin: 0, padding: 0 }}
                      disabled={busy}
                    >
                      <legend
                        style={{
                          padding: 0,
                          fontFamily: "var(--font-ui)",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {opt.label}
                      </legend>
                      {opt.detail ? (
                        <p
                          style={{
                            margin: "4px 0 10px",
                            fontFamily: "var(--font-ui)",
                            fontSize: 12.5,
                            color: "var(--ink-mute)",
                            lineHeight: 1.5,
                          }}
                        >
                          {opt.detail}
                        </p>
                      ) : (
                        <div style={{ height: 8 }} />
                      )}
                      <div style={{ display: "grid", gap: 8 }}>
                        {opt.choices.map((choice) => (
                          <label
                            key={choice.value}
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                              cursor: busy ? "default" : "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`${pack.moduleId}.${opt.key}`}
                              checked={current === choice.value}
                              disabled={busy}
                              onChange={() => void choose(pack.moduleId, opt.key, choice.value)}
                              style={{ marginTop: 3 }}
                            />
                            <span>
                              <span
                                style={{
                                  fontFamily: "var(--font-ui)",
                                  fontSize: 13.5,
                                  color: "var(--ink)",
                                }}
                              >
                                {choice.label}
                                {choice.value === opt.byDefault ? (
                                  <span style={{ color: "var(--ink-mute)", fontSize: 12 }}>
                                    {"  "}· default
                                  </span>
                                ) : null}
                              </span>
                              {choice.detail ? (
                                <span
                                  style={{
                                    display: "block",
                                    fontFamily: "var(--font-ui)",
                                    fontSize: 12.5,
                                    color: "var(--ink-mute)",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {choice.detail}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                      {!isDefault ? (
                        <div style={{ marginTop: 8 }}>
                          <Button
                            variant="quiet"
                            disabled={busy}
                            onClick={() => void choose(pack.moduleId, opt.key, null)}
                          >
                            Reset to default
                          </Button>
                        </div>
                      ) : null}
                    </fieldset>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
