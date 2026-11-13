"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type PWAContextValue = {
  promptEvent: InstallPromptEvent | null;
  installed: boolean;
  install: () => Promise<void>;
};

const PWAContext = createContext<PWAContextValue | null>(null);

function subscribeDisplayMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function getDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getServerDisplayMode() {
  return false;
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] =
    useState<InstallPromptEvent | null>(null);

  const [installed, setInstalled] = useState(false);

  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    getDisplayMode,
    getServerDisplayMode
  );

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch((error: unknown) => {
          console.warn("PolyMate service worker:", error);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;

    const event = promptEvent;
    setPromptEvent(null);

    await event.prompt();
    await event.userChoice;
  }

  return (
    <PWAContext.Provider
      value={{
        promptEvent,
        installed: installed || standalone,
        install,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function InstallAppButton({
  className = "",
}: {
  className?: string;
}) {
  const pwa = useContext(PWAContext);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!pwa || pwa.installed) return null;

  async function handleInstall() {
    if (!pwa) return;

    if (!pwa.promptEvent) {
      setShowHelp((value) => !value);
      return;
    }

    setBusy(true);

    try {
      await pwa.install();
    } catch {
      setShowHelp(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handleInstall}
        disabled={busy}
        className="mx-auto flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1746a2] hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300"
      >
        <Download size={19} aria-hidden="true" />
        {busy ? "Opening installer..." : "Install PolyMate"}
      </button>

      {showHelp && (
        <div className="mx-auto mt-3 max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold">Install PolyMate</p>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              aria-label="Close installation instructions"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-3">
            If installation is available, use your browser menu.
          </p>

          <p className="mb-2">
            <strong>Android:</strong> Open Chrome, tap the
            three-dot menu, then Install app or Add to Home screen.
          </p>

          <p className="mb-2">
            <strong>Windows:</strong> Open Chrome or Edge and
            select Install PolyMate from the browser menu.
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            If already installed, open PolyMate from your home
            screen or Start menu.
          </p>
        </div>
      )}
    </div>
  );
}
