/**
 * iCal Feed — admin route wrapping the shared ICalFeedSurface
 * (H07 §S3 surface 21, Cluster C close-out).
 *
 * Phase 11 backend is unbuilt — the route holds local feed state.
 * URL regeneration / clipboard copy stay as Toast stand-ins.
 */

import {
  type ICalFeedRecord,
  type ICalIncludeKey,
  type ICalVisibility,
  ICalFeedSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";

const INITIAL: ICalFeedRecord = {
  feed_name: "My practice calendar",
  includes: {
    resh: true,
    workings: true,
    pilgrimage: false,
    lunar: true,
    hours: false,
    custom: false,
  },
  visibility: "private",
  feed_url: "webcal://theourgia.app/ical/v1/8f3a-d29c.ics",
  connected_count: 2,
};

export function ICalFeedRoute() {
  useTopbar(
    () => ({
      title: "Calendar feed",
      subtitle:
        "An iCal feed of your practice, for any external calendar.",
    }),
    [],
  );

  const [record, setRecord] = useState<ICalFeedRecord>(INITIAL);

  const handleChangeName = useCallback((feed_name: string) => {
    setRecord((r) => ({ ...r, feed_name }));
  }, []);

  const handleToggleInclude = useCallback(
    (id: ICalIncludeKey, next: boolean) => {
      setRecord((r) => ({
        ...r,
        includes: { ...r.includes, [id]: next },
      }));
    },
    [],
  );

  const handleChangeVisibility = useCallback((v: ICalVisibility) => {
    setRecord((r) => ({ ...r, visibility: v }));
  }, []);

  const handleCopyUrl = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(record.feed_url).catch(() => {});
    }
    Toast.push({
      tone: "info",
      title: "URL copied",
      body: "Paste it into any iCal-compatible calendar client.",
    });
  }, [record.feed_url]);

  const handleRegenerate = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "URL regenerated",
      body: "Existing clients will need to re-subscribe. Phase 11 backend lands next.",
    });
    setRecord((r) => ({
      ...r,
      feed_url: `webcal://theourgia.app/ical/v1/${Math.random()
        .toString(16)
        .slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}.ics`,
    }));
  }, []);

  return (
    <ICalFeedSurface
      record={record}
      onChangeName={handleChangeName}
      onToggleInclude={handleToggleInclude}
      onChangeVisibility={handleChangeVisibility}
      onCopyUrl={handleCopyUrl}
      onRegenerate={handleRegenerate}
    />
  );
}
