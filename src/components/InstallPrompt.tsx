import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "kori_install_dismissed_at";
const INSTALLED_KEY = "kori_pwa_installed";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function wasInstalled() {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
}

function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* empty */ }
}

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 86400_000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Persist installed state so we never re-prompt on the same device
    if (isStandalone()) { markInstalled(); return; }
    if (wasInstalled() || recentlyDismissed()) return;
    if (window.self !== window.top) return; // iframe preview

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => {
      markInstalled();
      setShow(false);
      setDeferred(null);
    };
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) { markInstalled(); setShow(false); }
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    mql?.addEventListener?.("change", onDisplayChange);

    // iOS Safari fallback (no beforeinstallprompt)
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS && isSafari) {
      iosTimer = setTimeout(() => { setIosHint(true); setShow(true); }, 1200);
    }

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);


  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* empty */ }
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 px-4 pointer-events-none">
      <div className="mx-auto max-w-md bg-card border border-border rounded-2xl shadow-card p-4 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-bottom-4">
        <div className="w-10 h-10 grid place-items-center rounded-xl bg-kori-gradient text-white shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">Installer KORI</p>
          {iosHint ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Appuie sur <Share className="inline w-3 h-3 mx-0.5" /> puis « Sur l'écran d'accueil ».
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajoute l'app à ton écran d'accueil pour un accès rapide.
            </p>
          )}
          {!iosHint && (
            <button
              onClick={install}
              className="mt-2 bg-kori-gradient text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Installer
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 -m-1 text-muted-foreground hover:text-foreground" aria-label="Plus tard">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
