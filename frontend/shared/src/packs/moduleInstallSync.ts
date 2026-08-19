/**
 * Pack-install sync, the web half — the counterpart to the phone's
 * `module-install` fact (see the phone's record_sync.dart).
 *
 * An installed pack is advertised across an account as a light document over
 * the same `/record/entries` shelf the record uses — id, name, kind, version,
 * enabled — and never its corpus. This is the pure, testable core of the web
 * side: build the fact for what the browser holds (web → phone), read the facts
 * another device advertised (phone → web), and a per-browser opt-in.
 *
 * Sophia's rules, kept: opt-in, bidirectional, offer-not-force. The opt-in is
 * per-browser (localStorage), because a browser is a device like the phone —
 * the phone's own toggle is per-device too, deliberately unsynced.
 */

export const MODULE_INSTALL_KIND = "module-install";

/** A record-shelf entry, the shape `/record/entries` speaks. */
export interface RecordEntry {
  id: string;
  kind: string;
  doc: Record<string, unknown>;
  updated_at_utc: string;
  deleted_at_utc: string | null;
}

/** The install fact carried in a `module-install` entry's doc. */
export interface ModuleInstallFact {
  id: string;
  name: string;
  moduleKind: string;
  version: number;
  enabled: boolean;
}

/** A feed pack, in the shape this module needs (matches FeedPack). */
interface PackRef {
  id: string;
  title: string;
  version: number;
}

/**
 * The wire entry advertising an installed pack (web → phone). The corpus never
 * travels — only the fact. `moduleKind` is left blank because the web installs
 * by bundle and does not carry the phone's ModuleKind; the phone offers by id,
 * so the kind is only a label.
 */
export function moduleInstallEntry(pack: PackRef, nowIso: string): RecordEntry {
  return {
    id: pack.id,
    kind: MODULE_INSTALL_KIND,
    doc: { v: 1, name: pack.title, moduleKind: "", version: pack.version, enabled: true },
    updated_at_utc: nowIso,
    deleted_at_utc: null,
  };
}

/**
 * The install facts another device advertised, from a page of record entries —
 * non-deleted `module-install` docs, deduped by id (last wins, the shelf
 * returns entries in sequence order so the newest is kept).
 */
export function parseModuleInstalls(entries: readonly RecordEntry[]): ModuleInstallFact[] {
  const byId = new Map<string, ModuleInstallFact>();
  for (const entry of entries) {
    if (entry.kind !== MODULE_INSTALL_KIND || entry.deleted_at_utc !== null) continue;
    const doc = entry.doc ?? {};
    byId.set(entry.id, {
      id: entry.id,
      name: typeof doc.name === "string" ? doc.name : "",
      moduleKind: typeof doc.moduleKind === "string" ? doc.moduleKind : "",
      version: typeof doc.version === "number" ? doc.version : 1,
      enabled: doc.enabled !== false,
    });
  }
  return [...byId.values()];
}

function slugMatches(installedSlug: string, packId: string): boolean {
  return installedSlug === packId || installedSlug === packId.replaceAll(".", "-");
}

/**
 * Which advertised packs this account does not already hold here — the "on your
 * phone" offers. An uninstall stays local, so only enabled facts are offered.
 */
export function offeredFromOtherDevices(
  facts: readonly ModuleInstallFact[],
  installedSlugs: readonly string[],
): ModuleInstallFact[] {
  return facts.filter(
    (fact) => fact.enabled && !installedSlugs.some((slug) => slugMatches(slug, fact.id)),
  );
}

const PACK_SYNC_KEY = "theourgia.packSync";

type ReadStore = Pick<Storage, "getItem">;
type WriteStore = Pick<Storage, "setItem">;

/** Whether this browser advertises its packs and reads others' offers. Off by default. */
export function packSyncEnabled(storage: ReadStore): boolean {
  try {
    return storage.getItem(PACK_SYNC_KEY) === "true";
  } catch {
    return false;
  }
}

export function setPackSyncEnabled(on: boolean, storage: WriteStore): void {
  try {
    storage.setItem(PACK_SYNC_KEY, on ? "true" : "false");
  } catch {
    // A browser that refuses storage simply never remembers the choice.
  }
}
