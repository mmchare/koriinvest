import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifyAdminGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_GATE_PASSWORD ?? "@xyzCharec14411441";
    const a = createHash("sha256").update(data.password, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    return { ok: timingSafeEqual(a, b) };
  });
