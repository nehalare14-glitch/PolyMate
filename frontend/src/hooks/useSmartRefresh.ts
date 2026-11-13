"use client";

import { useEffect, useRef } from "react";

type RefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useSmartRefresh(
  refresh: () => Promise<void>,
  {
    enabled = true,
    intervalMs = 15000,
  }: RefreshOptions = {}
) {

  const refreshRef = useRef(refresh);

  const runningRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {

    if (!enabled) return;

    let active = true;

    async function runRefresh() {

      if (
        !active ||
        runningRef.current ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      ) {
        return;
      }

      runningRef.current = true;

      try {

        await refreshRef.current();

      } catch {

        // A temporary connection failure should
        // not interrupt the current conversation.

      } finally {

        runningRef.current = false;

      }

    }

    const timer = window.setInterval(
      () => void runRefresh(),
      Math.max(intervalMs, 10000)
    );

    function handleVisibility() {

      if (document.visibilityState === "visible") {
        void runRefresh();
      }

    }

    function handleOnline() {
      void runRefresh();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {

      active = false;

      window.clearInterval(timer);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

    };

  }, [enabled, intervalMs]);

}
