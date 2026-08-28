// Registers the push service worker (/sw-push.js) at startup so that the app
// meets Chrome's PWA installability criteria (a service worker with a fetch
// handler) even before the user enables notifications.
//
// Never register inside dev / Lovable preview / iframes: a service worker is
// browser-held state and could keep serving stale content there.
// Any other production origin (Lovable published, Vercel, custom domain) is
// allowed.

export function isRefusedSwContext(): string | null {
  if (typeof window === "undefined") return "ssr";
  if (!("serviceWorker" in navigator)) return "no-serviceworker-support";
  if (!import.meta.env.PROD) return "dev";
  const h = window.location.hostname;
  if (window.self !== window.top) return "iframe";
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return "lovable-preview";
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return "lovable-preview";
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return "lovable-preview";
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return "lovable-preview";
  if (new URLSearchParams(window.location.search).get("sw") === "off") return "sw-off";
  if (window.location.protocol !== "https:" && h !== "localhost" && h !== "127.0.0.1") return "insecure-origin";
  return null;
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers /sw-push.js once. Safe to call multiple times. */
export function ensureAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (isRefusedSwContext()) return Promise.resolve(null);
  registration = navigator.serviceWorker
    .register("/sw-push.js", { scope: "/" })
    .catch((err) => {
      registration = null;
      console.warn("[KORI] service worker registration failed", err);
      return null;
    });
  return registration;
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined") return;
  if (isRefusedSwContext()) return;
  // The `load` event may already have fired by the time React hydrates
  // (common on statically served deployments like Vercel), in which case a
  // `load` listener would never run — register immediately in that case.
  if (document.readyState === "complete") {
    void ensureAppServiceWorker();
  } else {
    window.addEventListener("load", () => void ensureAppServiceWorker(), { once: true });
  }
}
