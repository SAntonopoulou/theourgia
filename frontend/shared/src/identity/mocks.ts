/**
 * Demo identity data — used by the Identities admin surface and the
 * acting-as topbar dropdown until the backend identity model lands.
 *
 * Names + bios are adapted from the designer's ``Theourgia Identities.dc.html``
 * demo, with the private-identity placeholder swapped from "Sophia" to
 * "Aspasia" (matching the SSO demo) so the maintainer's legal name never
 * appears in committed demo content. The bio is in the first person —
 * the demo is what the *owner* sees when looking at her own identities.
 */

import type { Identity, SurfaceDefault } from "./types.js";

export const ACTING_AS_DEFAULT_ID = "aspasia";

export const DEMO_IDENTITIES: Identity[] = [
  {
    id: "aspasia",
    vaultId: "demo-vault",
    name: "Aspasia",
    displayName: "Aspasia",
    glyph: "Α",
    glyphTone: "accent",
    kind: "Private practitioner · Adeptus Minor",
    bio: "The name I practice under. Private journal and sealed workings — never published.",
    signing: {
      algo: "ed25519",
      publicKey: "9F2A·7C41·B6D0·E831",
      createdAt: "2022-09-21T00:00:00Z",
    },
    signingEnabled: true,
    archived: false,
    defaultsBySurface: {
      journal: "aspasia",
      synchronicity: "aspasia",
      divination: "aspasia",
    },
    tags: [{ label: "Acting now", tone: "success" }],
    authorsOn: ["Journal", "Workings", "Synchronicities"],
  },
  {
    id: "theo",
    vaultId: "demo-vault",
    name: "Theophrastos",
    displayName: "Θεόφραστος (Theophrastos)",
    glyph: "Θ",
    glyphTone: "accent",
    kind: "Public · Hellenic theurgist",
    bio: "Public face for theurgic essays and the open vault homepage. Carries my lineage attestations.",
    signing: {
      algo: "ed25519",
      publicKey: "4B1C·0FA9·77E2·5C6A",
      createdAt: "2019-03-21T00:00:00Z",
    },
    signingEnabled: true,
    archived: false,
    defaultsBySurface: {
      publication: "theo",
    },
    tags: [{ label: "Public", tone: "soft" }],
    authorsOn: ["Public homepage", "Lineage", "Essays"],
  },
  {
    id: "frater",
    vaultId: "demo-vault",
    name: "Frater Sub Rosā",
    displayName: "Frater Sub Rosā V°",
    glyph: "✠",
    glyphTone: "accent",
    kind: "Order · O.T.O. · V° Sovereign Prince",
    bio: "Order motto. Authors the Thelemic blog and the network ritual feed within the lodge.",
    signing: {
      algo: "ed25519",
      publicKey: "D5E8·11B7·A24F·90C3",
      createdAt: "2018-06-21T00:00:00Z",
    },
    signingEnabled: true,
    archived: false,
    defaultsBySurface: {
      blog: "frater",
      ritualFeed: "frater",
    },
    tags: [{ label: "Network", tone: "soft" }],
    authorsOn: ["Blog", "Network feed"],
  },
  {
    id: "nullp",
    vaultId: "demo-vault",
    name: "null.priest",
    displayName: "null.priest",
    glyph: "∅",
    glyphTone: "mute",
    kind: "Pseudonymous · severed",
    bio: "No lineage, no key linkage. Chaos work shared anonymously, attributable to no one.",
    signing: {
      algo: "ed25519",
      publicKey: "",
      createdAt: "1970-01-01T00:00:00Z",
    },
    signingEnabled: false,
    archived: false,
    defaultsBySurface: {},
    tags: [{ label: "Unsigned", tone: "warn" }],
    authorsOn: [],
  },
  {
    id: "varchive",
    vaultId: "demo-vault",
    name: "V.",
    displayName: "V.",
    glyph: "V",
    glyphTone: "mute",
    kind: "Archived · retired 2024",
    bio: "Read-only. Past entries keep their attribution and signature; this name cannot author new work.",
    signing: {
      algo: "ed25519",
      publicKey: "1A07·C3F2·5589·B4DE",
      createdAt: "2014-12-01T00:00:00Z",
    },
    signingEnabled: true,
    archived: true,
    defaultsBySurface: {},
    tags: [],
    authorsOn: [],
  },
];

/**
 * The Defaults-by-Surface table on the Identities surface. The icons
 * are inline SVG path strings; the surface component renders them.
 */
export const DEMO_SURFACE_DEFAULTS: SurfaceDefault[] = [
  {
    key: "journal",
    label: "Private journal & workings",
    iconPath: "M12 6c-2-1.3-4.6-1.5-7-.9v12.4c2.4-.6 5-.4 7 .9 2-1.3 4.6-1.5 7-.9V5.1c-2.4-.6-5-.4-7 .9z M12 6v12.4",
    identityId: "aspasia",
  },
  {
    key: "publication",
    label: "Public vault homepage",
    iconPath: "M3.5 4.5h17v15h-17z M7 9h10 M7 12.5h7",
    identityId: "theo",
  },
  {
    key: "blog",
    label: "Blog & essays",
    iconPath: "M4 5.5h16 M4 12h16 M4 18.5h10",
    identityId: "frater",
  },
  {
    key: "ritualFeed",
    label: "Network ritual feed",
    iconPath: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18",
    identityId: "frater",
  },
  {
    key: "publication" as const,
    label: "Lineage attestations",
    iconPath: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4",
    identityId: "theo",
  },
];
