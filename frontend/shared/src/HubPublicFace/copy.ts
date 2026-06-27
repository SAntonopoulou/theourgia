/**
 * HubPublicFace · verbatim copy from H08
 * `Theourgia Hub Public Face.dc.html`.
 *
 * This is a PUBLIC surface — no auth required. The strings here
 * are what non-members see when they visit `/hub/{slug}`.
 */

/** Verbatim header chip copy per viewer state. */
export const HPF_MEMBER_CHIP = "You're a member.";
export const HPF_PENDING_CHIP = "Your join request is pending review.";

/** Hero "Established {when}" prefix. */
export const HPF_ESTABLISHED_PREFIX = "Established ";

/** Section eyebrows. */
export const HPF_ABOUT = "About";
export const HPF_FEATURED = "Featured";

/** Membership policy band — three closed values mirror the H08
 *  supplement's MembershipPolicy union. The title + subtitle copy
 *  is verbatim per-policy from the .dc.html. */
export type MembershipPolicy = "public" | "open-with-approval" | "private";

export const HPF_POLICY_COPY: Record<
  MembershipPolicy,
  { title: string; subtitle: string }
> = {
  public: {
    title: "Public",
    subtitle: "Anyone may join with one click.",
  },
  "open-with-approval": {
    title: "Open with approval",
    subtitle:
      "Submit a request, and the hub's admins review it.",
  },
  private: {
    title: "Private",
    subtitle: "This hub is invitation-only.",
  },
};

/** CTA copy per (policy, viewerState). Each combination is locked
 *  here so a future commit can't paraphrase. */
export const HPF_CTA_JOIN_PUBLIC = "Join";
export const HPF_CTA_REQUEST_TO_JOIN = "Request to join";
export const HPF_CTA_INVITATION_ONLY = "This hub is invitation-only";
export const HPF_CTA_ALREADY_MEMBER = "You're already a member";
export const HPF_CTA_REQUEST_PENDING = "Request pending";

/** Footer credit — verbatim, with the H08-mandated `‡` glyph. */
export const HPF_AGPL_CREDIT = "‡ Powered by Theourgia (AGPLv3)";
