import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Award,
  ChevronDown,
  Download,
  Phone,
  Share,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fsf-install-dropdown-dismissed-session";

export function InstallAppLine() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    // Check standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem(DISMISS_KEY) === "true") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|crmo/i.test(navigator.userAgent);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // On iOS Safari, display the add to home screen guidance
    if (isIos && isSafari) {
      setShowIosHelp(true);
      // Show on portal, apply, or admin
      const isPriorityPage =
        location.pathname.startsWith("/portal") ||
        location.pathname.startsWith("/apply") ||
        location.pathname.startsWith("/admin");
      if (isPriorityPage) {
        setVisible(true);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [location.pathname]);

  if (!visible || isStandalone) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
    } catch {
      // Fallback
    } finally {
      setPromptEvent(null);
    }
  };

  return (
    <aside
      role="banner"
      aria-label="Install Free School Foundation Application"
      className="sticky top-0 z-50 w-full animate-in slide-in-from-top duration-300 border-b border-brand-green/30 bg-gradient-to-r from-emerald-950 via-brand-green-dark to-emerald-950 px-4 py-3 text-white shadow-lift"
    >
      <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: App Logo & Notification Title */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white p-1.5 shadow-md ring-2 ring-brand-green/40">
            <img
              src="/icon-192.png"
              alt="FSF App"
              className="h-full w-full object-contain"
              onError={(e) => {
                // Fallback to Shield icon if image loading fails
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <Shield className="h-6 w-6 text-brand-green-dark" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-brand-orange px-1.5 py-0.2 text-[10px] font-extrabold uppercase tracking-wide text-white">
                <Sparkles className="h-2.5 w-2.5" /> Official App
              </span>
              <h2 className="text-xs font-bold text-white sm:text-sm">
                Install App for Easy Access
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-emerald-100/90 leading-snug">
              {showIosHelp ? (
                <span>
                  Tap <strong>Share</strong> <Share className="inline h-3 w-3" /> and select{" "}
                  <strong>Add to Home Screen</strong> for instant admission portal access.
                </span>
              ) : (
                "Install on your phone or PC for 1-tap portal access, real-time alerts, and offline access."
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {promptEvent && (
            <Button
              type="button"
              size="sm"
              onClick={() => void install()}
              className="h-9 gap-1.5 rounded-xl bg-white px-4 text-xs font-extrabold text-brand-green-dark shadow-sm hover:bg-emerald-50 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" /> Install App
            </Button>
          )}

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss installation prompt"
            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
