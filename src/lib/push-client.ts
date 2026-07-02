export const VAPID_PUBLIC_KEY =
  "BIPB9nYXNzQNYMHepL6P8w3_ZocDYbq4GeTkHkR80yFxvVmlog7-w5sGLfu4dc4YgcZ4DDtcdmhNs1QWr6RfNr0";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerPushSW() {
  if (!pushSupported()) throw new Error("Notifications non supportées sur cet appareil");
  return navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
}

export async function getPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(): Promise<{ endpoint: string; p256dh: string; auth: string }> {
  const reg = await registerPushSW();
  await reg.update().catch(() => {});
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission refusée");
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

export async function unsubscribePush() {
  const sub = await getPushSubscription();
  if (sub) await sub.unsubscribe();
}
