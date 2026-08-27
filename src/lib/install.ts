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
