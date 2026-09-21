import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const adjustSchema = z.object({
  user_id: z.string().uuid(),
  delta: z.number().refine((n) => n !== 0, "non-zero"),
  reason: z.string().min(3).max(500),
});

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adjustSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: out, error } = await context.supabase.rpc("admin_my_adjust_balance" as never, {
      _user: data.user_id, _delta: data.delta, _reason: data.reason,
    } as never);
    if (error) throw new Error(error.message);
    const result = out as unknown as { ok: boolean; error?: string; new_balance?: number };
    if (!result.ok) throw new Error(result.error ?? "Erreur");
    // Notify user
    try {
      const { sendPushToUser } = await import("./push.server");
      const sign = data.delta > 0 ? "+" : "";
      await sendPushToUser(context.supabase as never, data.user_id, {
        title: data.delta > 0 ? "Crédit reçu" : "Ajustement de solde",
        body: `${sign}${data.delta} KRI — ${data.reason}`,
        url: "/app",
      });
    } catch (_) { /* push optional */ }
    return result;
  });
