/**
 * ActivityPubSettings · verbatim copy from H08
 * `Theourgia ActivityPub Settings.dc.html`.
 *
 * Master rule: ActivityPub ONLY sees Visibility=public content
 * (H08 rule 27). No personal / viewer-scoped / hub / sealed
 * content ever federates.
 */

export const APS_CRUMB = "Settings · Fediverse";
export const APS_TITLE = "Fediverse (ActivityPub) integration";

/** Intro paragraph — verbatim. */
export const APS_INTRO_HEAD =
  "How your ";
/** Italic span: "public" */
export const APS_INTRO_PUBLIC_EM = "public";
export const APS_INTRO_TAIL =
  " content reaches Mastodon, Pleroma, and other ActivityPub platforms. Nothing here changes what is private — only how already-public writings are announced outward.";

/** Master-switch card. */
export const APS_MASTER_LABEL = "Enable Fediverse integration";
export const APS_MASTER_SUB_ON =
  "Enabled — your public actor is reachable from the Fediverse.";
export const APS_MASTER_SUB_OFF =
  "Off. Your vault does not federate to ActivityPub platforms.";

/** First-activation alertdialog — verbatim. */
export const APS_CONFIRM_TITLE =
  "Open your public actor to the wider web";
export const APS_CONFIRM_SUB =
  "This is the one irreversible-feeling step in Theourgia.";
/**
 * Body has two emphasised inline spans — render the leading
 * sentence, then the `<strong>public</strong>` mark, then the
 * tail. Verbatim.
 */
export const APS_CONFIRM_BODY_HEAD = "Once enabled, your ";
export const APS_CONFIRM_BODY_PUBLIC_STRONG = "public";
export const APS_CONFIRM_BODY_TAIL =
  " writings can be fetched, followed, and re-shared by servers you do not control. Personal, viewer-scoped, hub, and sealed content are never affected — only what you have already set to Public. You can disable integration later, but copies already federated may persist in other servers' caches.";
export const APS_CONFIRM_CANCEL = "Not yet";
export const APS_CONFIRM_OK = "Enable integration";

/** Profile band. */
export const APS_PROFILE_HEADING = "Public profile";
export const APS_PROFILE_SUBHEAD =
  "This is the actor other servers will see.";
export const APS_WEBFINGER_HELPER =
  "Your WebFinger handle — how people find and follow you.";
export const APS_LABEL_DISPLAY_NAME = "Display name override";
export const APS_LABEL_BIO = "Bio override";

/** Follower approval band. */
export const APS_APPROVAL_HEADING = "Follower approval";
export const APS_APPROVAL_SUBHEAD =
  "Who may follow your public actor.";
export type FollowApprovalKey = "auto" | "manual";
export const APS_APPROVAL_OPTIONS: ReadonlyArray<
  readonly [FollowApprovalKey, string, string]
> = [
  ["auto", "Auto-accept follows", "recommended for hubs"],
  [
    "manual",
    "Manually approve follows",
    "recommended for vaults",
  ],
];

/** Per-object-type band. */
export const APS_OBJECT_HEADING =
  "How each kind of content appears";
export const APS_OBJECT_SUBHEAD =
  "The ActivityPub object type each public kind maps to. Anything richer degrades to a plain Note.";

export interface ApObjectMapping {
  /** Wire key. */
  key: "essays" | "notes" | "rituals" | "publications";
  /** User-facing label. */
  label: string;
  /** Short helper line. */
  note: string;
  /** Options (default first). */
  opts: readonly string[];
}

export const APS_OBJECT_TYPES: readonly ApObjectMapping[] = [
  {
    key: "essays",
    label: "Essays & long writings",
    note: "public blog posts and essays",
    opts: ["Article", "Note", "Page"],
  },
  {
    key: "notes",
    label: "Short notes",
    note: "quick public notes",
    opts: ["Note", "Article"],
  },
  {
    key: "rituals",
    label: "Group rituals",
    note: "public scheduled rites",
    opts: ["Event", "Note"],
  },
  {
    key: "publications",
    label: "Publications",
    note: "released books and zines",
    opts: ["Article", "Document", "Note"],
  },
];

/** Outbound activities band. */
export const APS_OUTBOUND_HEADING = "Outbound activities";
export const APS_OUTBOUND_SUBHEAD =
  "Which changes are broadcast to your followers' servers.";

export type OutboundActivityKey = "create" | "update" | "delete";
export interface ApOutboundActivity {
  key: OutboundActivityKey;
  label: string;
  note: string;
  /** Default-on for create / update, default-off for delete. */
  defaultOn: boolean;
}

export const APS_OUTBOUND: readonly ApOutboundActivity[] = [
  {
    key: "create",
    label: "Create — announce new public content",
    note:
      "new essays, notes, and rituals are sent to followers",
    defaultOn: true,
  },
  {
    key: "update",
    label: "Update — announce edits",
    note:
      "when you revise a public post, followers see the update",
    defaultOn: true,
  },
  {
    key: "delete",
    label: "Delete — announce removals",
    note:
      "broadcast a Delete when you unpublish. You may suppress this — remote caches keep copies regardless",
    defaultOn: false,
  },
];

/** Footer CTAs. */
export const APS_DISCARD_CTA = "Discard changes";
export const APS_SAVE_CTA = "Save settings";
