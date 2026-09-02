"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeVisitCounts,
  type VisitCounts,
} from "@/lib/visits";

const VISITOR_TOKEN_KEY = "kiring-visitor-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function VisitCounter({
  publicId,
  initialCounts,
}: {
  publicId: string;
  initialCounts: VisitCounts | null;
}) {
  const [counts, setCounts] = useState(initialCounts);

  useEffect(() => {
    let cancelled = false;

    async function recordAndRefresh() {
      const supabase = createClient();
      const visitorToken = getOrCreateVisitorToken();

      if (!supabase) return;

      if (visitorToken) {
        // The RPC independently excludes the authenticated owner and dedupes
        // the same browser/Ki-ring/day combination.
        await supabase.rpc("record_keyring_visit", {
          target_public_id: publicId,
          visitor_token_value: visitorToken,
        });
      }

      const { data, error } = await supabase.rpc(
        "get_keyring_visit_counts",
        { target_public_id: publicId }
      );

      if (cancelled || error) return;

      const nextCounts = normalizeVisitCounts(data);
      if (nextCounts) setCounts(nextCounts);
    }

    void recordAndRefresh();
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  return (
    <span
      className="visitCounter"
      aria-label={
        counts
          ? `Today ${counts.todayCount}, total ${counts.totalCount}`
          : "Visitor counts unavailable"
      }
    >
      TODAY <strong>{formatCount(counts?.todayCount)}</strong>
      {" · "}
      TOTAL <strong>{formatCount(counts?.totalCount)}</strong>
    </span>
  );
}

function getOrCreateVisitorToken() {
  try {
    const existing = localStorage.getItem(VISITOR_TOKEN_KEY);
    if (existing && UUID_PATTERN.test(existing)) {
      return existing;
    }

    const token = crypto.randomUUID();
    localStorage.setItem(VISITOR_TOKEN_KEY, token);
    return token;
  } catch {
    // If stable storage is unavailable, skip recording instead of creating a
    // new identity on every refresh and inflating the counter.
    return null;
  }
}

function formatCount(value: number | undefined) {
  return value === undefined
    ? "--"
    : new Intl.NumberFormat("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: true,
      }).format(value);
}
