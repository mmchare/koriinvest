import webpush from "web-push";

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

type RpcClient = {
  rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>;
};

type Target = { id: string; endpoint: string; p256dh: string; auth: string };

async function deliver(client: RpcClient, rows: Target[], payload: PushPayload) {
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
        await client.rpc("prune_push_subscription", { _id: r.id });
      }
    }
  }
  return ok;
}

function asTargets(data: unknown): Target[] {
  return Array.isArray(data) ? (data as Target[]) : [];
}

/** Send to one user. Requires an admin session client (or the user's own client for self). */
export async function sendPushToUser(client: RpcClient, userId: string, payload: PushPayload) {
  const { data } = await client.rpc("admin_push_targets", { _user: userId });
  const rows = asTargets(data);
  if (rows.length === 0) return 0;
  return deliver(client, rows, payload);
}

/** Broadcast to every subscriber. Requires an admin session client. */
export async function sendPushToAll(client: RpcClient, payload: PushPayload) {
  const { data } = await client.rpc("admin_push_targets_all");
  const rows = asTargets(data);
  if (rows.length === 0) return 0;
  return deliver(client, rows, payload);
}
