import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@koriinvest.lovable.app";
  if (!pub || !priv) throw new Error("VAPID keys missing");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

async function deliver(rows: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>, payload: PushPayload) {
  configure();
  const body = JSON.stringify(payload);
  let ok = 0;
  for (const r of rows) {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, body, { TTL: 60 * 60 });
      ok++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", r.id);
      }
    }
  }
  return ok;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!data || data.length === 0) return 0;
  return deliver(data, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const { data } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!data || data.length === 0) return 0;
  return deliver(data, payload);
}
