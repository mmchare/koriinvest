import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/notchpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hashKey = process.env.NOTCHPAY_HASH_KEY;
        const rawBody = await request.text();

        // Signature verification (NotchPay sends x-notch-signature: HMAC-SHA256 of body with hash key)
        if (hashKey) {
          const sigHeader = request.headers.get("x-notch-signature") ?? "";
          const expected = createHmac("sha256", hashKey).update(rawBody).digest("hex");
          const a = Buffer.from(sigHeader);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: { event?: string; data?: { reference?: string; status?: string } };
        try { payload = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

        const reference = payload?.data?.reference;
        const status = payload?.data?.status;
        if (!reference) return new Response("Missing reference", { status: 400 });

        // Only credit on successful payment events
        const ok = status === "complete" || status === "completed" || status === "successful" || payload?.event === "payment.complete";
        if (!ok) return new Response("Ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc(
          "notchpay_credit_deposit" as never,
          { _reference: reference, _payload: payload } as never,
        );
        if (error) {
          console.error("notchpay webhook credit error", error);
          return new Response("Internal error", { status: 500 });
        }
        return Response.json({ ok: true, result: data });
      },
    },
  },
});
