// Registers the push service worker (/sw-push.js) at startup so that the app
// meets Chrome's PWA installability criteria (a service worker with a fetch
// handler) even before the user enables notifications.
//
// Never register inside dev / Lovable preview / iframes: a service worker is
// browser-held state and could keep serving stale content there.

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  const h = window.location.hostname;
  if (window.self !== window.top) return true; // iframe (e.g. Lovable preview)
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-push.js", { scope: "/" }).catch(() => {});
  });
}
