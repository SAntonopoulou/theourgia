/**
 * Followers — admin route at ``/followers``.
 *
 * Wired to ``/api/v1/activitypub/followers`` + ``/follow-requests``
 * per the admin API-wiring convention. No engagement metrics surface
 * (rule 18) — the list is name + handle + when-followed only.
 */

import { useMemo } from "react";

import {
  type FollowerRow,
  FollowersPaneSurface,
  type PendingFollowRow,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type ApFollower,
  type ApFollowRequest,
  useApFollowRequestAction,
  useApFollowRequests,
  useApFollowers,
} from "../lib/activitypub.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceLabel(iso: string, now: number = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  if (days < 1) return "today";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }
  const m = Math.floor(days / 30);
  return `${m} month${m === 1 ? "" : "s"}`;
}

function nameAndInitial(handle: string | null, did: string): {
  name: string;
  initial: string;
} {
  const display = handle ?? did;
  // For "@user@host" pull the user part; otherwise first char of did.
  const userPart = display.startsWith("@")
    ? display.slice(1).split("@")[0] ?? display
    : display;
  return {
    name: userPart,
    initial: (userPart[0] ?? "·").toUpperCase(),
  };
}

function toFollowerRow(f: ApFollower, index: number): FollowerRow {
  const { name, initial } = nameAndInitial(f.follower_handle, f.follower_did);
  return {
    id: f.id,
    name,
    handle: f.follower_handle ?? f.follower_did,
    tradition: "—",
    since: sinceLabel(f.created_at),
    initial,
    tone: (index % 4) as 0 | 1 | 2 | 3,
  };
}

function toPendingRow(r: ApFollowRequest, index: number): PendingFollowRow {
  const { name, initial } = nameAndInitial(r.follower_handle, r.follower_did);
  return {
    id: r.id,
    name,
    handle: r.follower_handle ?? r.follower_did,
    initial,
    tone: (index % 4) as 0 | 1 | 2 | 3,
  };
}

export function Followers() {
  useTopbar(() => ({ title: "Followers" }));

  const followers = useApFollowers();
  const requests = useApFollowRequests();
  const action = useApFollowRequestAction();

  const followerRows = useMemo(
    () =>
      followers.data ? followers.data.map((f, i) => toFollowerRow(f, i)) : [],
    [followers.data],
  );
  const pendingRows = useMemo(
    () =>
      requests.data ? requests.data.map((r, i) => toPendingRow(r, i)) : [],
    [requests.data],
  );

  if (followers.isLoading || requests.isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  const error = followers.error ?? requests.error;
  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your followers."
        message={error.message}
        onRetry={() => {
          void followers.refetch();
          void requests.refetch();
        }}
      />
    );
  }

  return (
    <>
      {action.error ? (
        <SurfaceError
          title="That action didn’t go through."
          message={action.error.message}
          onRetry={() => action.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <FollowersPaneSurface
        followers={followerRows}
        pending={pendingRows}
        onApprove={(id) => action.mutate({ id, action: "approve" })}
        onDecline={(id) => action.mutate({ id, action: "decline" })}
      />
    </>
  );
}
