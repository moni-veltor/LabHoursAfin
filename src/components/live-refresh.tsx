"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the board current without anybody pressing anything.
 *
 * Only while the tab is actually visible — a leaderboard left open on a second
 * monitor overnight should not spend the night querying. It refetches on
 * becoming visible again too, so coming back to the tab shows now, not then.
 */
export function LiveRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      stop();
      id = setInterval(() => router.refresh(), seconds * 1000);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);

  return null;
}
