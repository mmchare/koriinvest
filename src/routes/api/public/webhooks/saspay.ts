import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type SasEvent = {
  event?: string;
  data?: { id?: string; reference?: string; status?: string; type?: string };
};

export const Route = createFileRoute("/api/public/webhooks/saspay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SASPAY_WEBHOOK_SECRET;
        const rawBody = await request.text();

        // Signature SasPay : HMAC-SHA256 hex de `${timestamp}.${body}`
        if (secret) {
          const sigHeader = request.headers.get("x-webhook-signature") ?? "";
          const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
          const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
          const a = Buffer.from(sigHeader.toLowerCase());
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
          const ts = Number(timestamp);
          if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 60 * 5) {
            return new Response("Stale timestamp", { status: 401 });
          }
        }

        let payload: SasEvent;
        try {
          payload = JSON.parse(rawBody) as SasEvent;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event = payload.event ?? request.headers.get("x-webhook-event") ?? "";
        const refs = [payload.data?.id, payload.data?.reference].filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        );
        if (event === "webhook.test") return Response.json({ ok: true, test: true });
        if (refs.length === 0) return new Response("Missing reference", { status: 400 });

        const status = (payload.data?.status ?? "").toUpperCase();
        const isSuccess = event === "transaction.success" || status === "SUCCESS";
        const isFailure =
          event === "transaction.failed" ||
          event === "transaction.cancelled" ||
          status === "FAILED" ||
          status === "CANCELLED";
        if (!isSuccess && !isFailure) return new Response("Ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const fn = isSuccess ? "saspay_credit_deposit" : "saspay_fail_deposit";

        let result: unknown = null;
        let matchedRef: string | null = null;
        for (const ref of refs) {
          const { data, error } = await supabaseAdmin.rpc(fn as never, {
            _reference: ref,
            _payload: payload,
          } as never);
          if (error) {
            console.error("saspay webhook rpc error", error);
            return new Response("Internal error", { status: 500 });
          }
          const ok = (data as { ok?: boolean; error?: string } | null)?.ok;
          result = data;
          if (ok) {
            matchedRef = ref;
            break;
          }
        }

        // SasPay ne retente que lorsque notre endpoint répond avec un statut non-2xx.
        // Un webhook peut arriver avant que la transaction soit enregistrée localement.
        if (!matchedRef) {
          console.error("saspay webhook transaction not matched", { event, refs, result });
          return Response.json(
            { ok: false, error: "Transaction temporairement introuvable" },
            { status: 503, headers: { "Retry-After": "30" } },
          );
        }

        if (isSuccess) {
          try {
            const { data: tx } = await supabaseAdmin
              .from("transactions")
              .select("user_id, amount_kori")
              .eq("provider_reference", matchedRef)
              .maybeSingle();
            if (tx) {
              const { sendPushToUserAdmin } = await import("@/lib/push.server");
              await sendPushToUserAdmin(tx.user_id, {
                title: "Dépôt crédité ✅",
                body: `+${tx.amount_kori} KRI ajoutés à ton solde.`,
                url: "/app",
              });
            }
          } catch (_) {
            /* push optionnel */
          }
        }

        return Response.json({ ok: true, result });
      },
    },
  },
});
