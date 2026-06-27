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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { data: out, error } = await supabaseAdmin.rpc("admin_adjust_balance" as never, {
      _admin: context.userId, _user: data.user_id, _delta: data.delta, _reason: data.reason,
    } as never);
    if (error) throw new Error(error.message);
    const result = out as { ok: boolean; error?: string; new_balance?: number };
    if (!result.ok) throw new Error(result.error ?? "Erreur");
    // Notify user
    try {
      const { sendPushToUser } = await import("./push.server");
      const sign = data.delta > 0 ? "+" : "";
      await sendPushToUser(data.user_id, {
        title: data.delta > 0 ? "Crédit reçu" : "Ajustement de solde",
        body: `${sign}${data.delta} KRI — ${data.reason}`,
        url: "/app",
      });
    } catch (_) { /* push optional */ }
    return result;
  });
