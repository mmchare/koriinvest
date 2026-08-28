import { useEffect, useState } from "react";

export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Shared store so InstallPrompt and the profile "Installer" button use the
// same captured beforeinstallprompt event.
let deferredPrompt: BIPEvent | null = null;
const listeners = new Set<() => void>();

export function getDeferredPrompt() {
  return deferredPrompt;
}

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BIPEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

export function isIOSSafari() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const ev = deferredPrompt;
  deferredPrompt = null;
  notify();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome;
}

export function useDeferredInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(deferredPrompt);
  useEffect(() => {
    const update = () => setDeferred(deferredPrompt);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);
  return deferred;
}

/** Explains why the native install prompt is not available (best effort). */
export async function getInstallDiagnostics(): Promise<string> {
  const { isRefusedSwContext, ensureAppServiceWorker } = await import("./sw-register");
  const refused = isRefusedSwContext();
  if (refused === "iframe" || refused === "lovable-preview")
    return "Ouvre le site dans un vrai onglet du navigateur (pas dans l'aperçu intégré).";
  if (refused === "insecure-origin") return "L'installation exige une connexion HTTPS.";
  if (refused === "no-serviceworker-support") return "Ce navigateur ne supporte pas l'installation.";
  if (refused === "dev") return "Indisponible en mode développement.";
  if (refused === "sw-off") return "Installation désactivée par le paramètre ?sw=off.";

  const reg = await ensureAppServiceWorker();
  if (!reg) return "Le service worker n'a pas pu être enregistré sur ce déploiement.";

  try {
    const res = await fetch("/manifest.webmanifest", { cache: "no-store" });
    if (!res.ok) return "Le fichier manifest.webmanifest n'est pas accessible sur ce déploiement.";
  } catch {
    return "Impossible de charger le manifest de l'application.";
  }

  return "Recharge la page puis réessaie. Sinon : menu ⋮ du navigateur → « Installer l'application ».";
}
