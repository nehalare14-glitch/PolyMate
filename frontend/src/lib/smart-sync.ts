"use client";

import {
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

const SYNC_EVENT = "polymate:sync";
const SYNC_STORAGE_KEY = "polymate-sync-event";

export function notifySmartSync() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(SYNC_EVENT));

  try {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      `${Date.now()}-${Math.random()}`
    );
  } catch {
    // Local synchronization remains available.
  }
}

export type SmartSyncOptions = {
  intervalMs?: number;
};

type SyncLoader = (
  user: User | null,
  initial: boolean
) => Promise<void>;

export function subscribeSmartSync(
  auth: Auth,
  loader: SyncLoader,
  options: SmartSyncOptions = {}
): () => void {
  const intervalMs = Math.max(
    15000,
    options.intervalMs ?? 30000
  );

  let disposed = false;
  let running = false;
  let queued = false;
  let initialized = false;
  let firstLoad = true;
  let currentUser: User | null = null;
  let lastStarted = 0;

  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function canRefresh() {
    return (
      !disposed &&
      initialized &&
      currentUser !== null &&
      document.visibilityState === "visible" &&
      navigator.onLine
    );
  }

  function schedule() {
    clearTimer();

    if (!canRefresh()) return;

    timer = setTimeout(() => {
      void refresh();
    }, intervalMs);
  }

  async function refresh(force = false) {
    if (disposed || !initialized) return;

    if (!force && !canRefresh()) {
      clearTimer();
      return;
    }

    if (running) {
      if (force) queued = true;
      return;
    }

    if (
      !force &&
      Date.now() - lastStarted < 2000
    ) {
      schedule();
      return;
    }

    clearTimer();
    running = true;
    lastStarted = Date.now();

    const initial = firstLoad;
    firstLoad = false;

    try {
      await loader(currentUser, initial);
    } catch {
      // Page-specific loaders manage their error messages.
      // A failed request must not stop future synchronization.
    } finally {
      running = false;

      if (disposed) return;

      if (queued) {
        queued = false;
        void refresh(true);
      } else {
        schedule();
      }
    }
  }

  function handleFocus() {
    if (canRefresh()) {
      void refresh();
    }
  }

  function handleVisibility() {
    if (document.visibilityState === "hidden") {
      clearTimer();
    } else {
      handleFocus();
    }
  }

  function handleOffline() {
    clearTimer();
  }

  function handleSyncEvent() {
    if (!canRefresh()) return;

    if (running) {
      queued = true;
      return;
    }

    void refresh(true);
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === SYNC_STORAGE_KEY) {
      handleSyncEvent();
    }
  }

  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      if (disposed) return;

      currentUser = user;
      initialized = true;
      firstLoad = true;

      void refresh(true);
    }
  );

  window.addEventListener(SYNC_EVENT, handleSyncEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("online", handleFocus);
  window.addEventListener("offline", handleOffline);

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    disposed = true;
    clearTimer();
    unsubscribe();

    window.removeEventListener(SYNC_EVENT, handleSyncEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleFocus);
    window.removeEventListener("offline", handleOffline);

    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };
}
