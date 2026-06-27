/**
 * PluginStatus — admin route at ``/plugins/status``.
 *
 * Renders the H09 Cluster A surface 5 against fixtures.
 */

import {
  type ActiveRow,
  type ErrorRow,
  PluginStatusDashboardSurface,
  useTopbar,
} from "@theourgia/shared";

const ACTIVE: ActiveRow[] = [
  {
    name: "Decanic Correspondences",
    version: "v1.4.2",
    loadMs: "84 ms",
    extensionPointsLabel: "3 active",
  },
  {
    name: "Geomancy Workbench",
    version: "v2.1.0",
    loadMs: "151 ms",
    extensionPointsLabel: "2 active",
  },
  {
    name: "Planetary Hours",
    version: "v3.0.0",
    loadMs: "63 ms",
    extensionPointsLabel: "1 active",
  },
  {
    name: "Runic Tabular Block",
    version: "v0.9.1",
    loadMs: "114 ms",
    extensionPointsLabel: "3 active",
  },
];

const ERRORS: ErrorRow[] = [
  {
    id: "e0",
    name: "Planetary Hours",
    version: "v3.0.0",
    summary:
      "EphemerisError: failed to load ephemeris table at startup",
    when: "27 Jun · 09:31",
    trace:
      'Traceback (most recent call last):\n  File "theourgia/core/plugins/loader.py", line 212, in _activate\n    instance.on_load(ctx)\n  File "plugins/planetary_hours/main.py", line 47, in on_load\n    self.ephemeris = load_swe(ctx.config["ephemeris_source"])\n  File "plugins/planetary_hours/swe.py", line 88, in load_swe\n    resp = http.get(url, timeout=5.0)\n  File "theourgia/core/net.py", line 134, in get\n    raise NetworkError(f"unreachable: {url}")\ntheourgia.core.net.NetworkError: unreachable: https://ephemeris.example/swe\n\nThe plugin requested network.outbound but the host is not responding.\nThe plugin is loaded in a degraded state; the Today widget is hidden until the ephemeris resolves.',
  },
  {
    id: "e1",
    name: "Trithemian Cipher",
    version: "v1.0.3",
    summary: "MigrationError: pending migration could not apply",
    when: "25 Jun · 14:02",
    trace:
      'Traceback (most recent call last):\n  File "theourgia/core/plugins/migrate.py", line 76, in run_pending\n    op.execute(stmt)\n  File "plugins/trithemian/migrations/0003_add_tableau.py", line 19, in upgrade\n    op.create_table("cipher_tableau", ...)\nsqlalchemy.exc.OperationalError: table cipher_tableau already exists\n\nThe migration was rolled back. The plugin remains at schema revision 0002.\nDeactivate and reactivate the plugin to retry, or report this to the author.',
  },
];

export function PluginStatus() {
  useTopbar(() => ({ title: "Plugin status" }));

  return (
    <PluginStatusDashboardSurface
      active={ACTIVE}
      errors={ERRORS}
      performance={{
        totalLoadTimeLabel: "412 ms",
        totalLoadTimeDetail: "across 4 active plugins, last startup",
        memoryLabel: "~38 MB",
        memoryDetail: "rough estimate, resident",
      }}
    />
  );
}
