import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SbClient = {
  rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function enforceRateLimit(client: SbClient, action: string, max: number, windowSeconds: number) {
  const { data, error } = await client.rpc("my_check_rate_limit", {
    _action: action, _max: max, _window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Trop de tentatives, réessaie dans quelques instants.");
}

// ---- Wheel ----
export const spinWheel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SbClient;
    await enforceRateLimit(sb, "spin_wheel", 3, 60);
    const { data, error } = await sb.rpc("my_spin_wheel");
    if (error) throw new Error(error.message);
    return data as { ok: boolean; reward_type?: string; reward?: number; error?: string; next_at?: string };
  });

// ---- Vault ----
const createVaultSchema = z.object({ amount: z.number().positive(), days: z.union([z.literal(7), z.literal(15), z.literal(30)]) });
export const createVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createVaultSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    const { data: out, error } = await sb.rpc("my_create_vault", { _amount: data.amount, _days: data.days });
    if (error) throw new Error(error.message);
    return out as { ok: boolean; vault_id?: string; profit?: number; error?: string };
  });

const claimVaultSchema = z.object({ vault_id: z.string().uuid() });
export const claimVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => claimVaultSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    const { data: out, error } = await sb.rpc("my_claim_vault", { _vault: data.vault_id });
    if (error) throw new Error(error.message);
    return out as { ok: boolean; returned?: number; error?: string };
  });

// ---- Deposit (NotchPay if NOTCHPAY_PUBLIC_KEY set, else mock PENDING tx) ----
const depositSchema = z.object({
  amount_cfa: z.number().positive().max(10_000_000),
  phone: z.string().min(6).max(20),
});
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    await enforceRateLimit(sb, "deposit_init", 5, 300);
    const { data: cfg } = await context.supabase
      .from("app_config").select("value").eq("key", "kri_per_xaf").maybeSingle();
    const rate = Number(cfg?.value ?? 0.1);
    const kri = Math.round(data.amount_cfa * rate * 10000) / 10000;

    const notchKey = process.env.NOTCHPAY_PUBLIC_KEY;
    let providerRef: string | null = null;
    let authorizationUrl: string | null = null;

    if (notchKey) {
      const { data: profile } = await context.supabase
        .from("profiles").select("phone_number, display_name").eq("id", context.userId).maybeSingle();
      const email = `${context.userId}@kori.app`;
      try {
        const resp = await fetch("https://api.notchpay.co/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: notchKey },
          body: JSON.stringify({
            email,
            amount: data.amount_cfa,
            currency: "XAF",
            description: `Dépôt KORI - ${kri} KRI`,
            reference: `kori_${context.userId.slice(0, 8)}_${Date.now()}`,
            customer: { phone: data.phone, name: profile?.display_name ?? "Utilisateur" },
            callback: "https://koriinvest.lovable.app/app",
          }),
        });
        const body = await resp.json() as { transaction?: { reference?: string }; authorization_url?: string; message?: string };
        if (!resp.ok || !body?.transaction?.reference) {
          throw new Error(body?.message ?? "Erreur NotchPay");
        }
        providerRef = body.transaction.reference;
        authorizationUrl = body.authorization_url ?? null;
      } catch (e) {
        throw new Error(`NotchPay: ${(e as Error).message}`);
      }
    }

    const { data: txId, error } = await sb.rpc("my_create_deposit", {
      _amount_cfa: data.amount_cfa,
      _amount_kori: kri,
      _phone: data.phone,
      _provider_reference: providerRef,
    });
    if (error) throw new Error(error.message);
    return { ok: true, tx_id: txId as string, kri, authorization_url: authorizationUrl };
  });

// ---- Withdrawal ----
const withdrawSchema = z.object({
  amount_cfa: z.number().positive().max(10_000_000),
  phone: z.string().min(6).max(20),
});
export const initiateWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withdrawSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    await enforceRateLimit(sb, "withdraw_init", 3, 600);
    const { data: out, error } = await sb.rpc("my_initiate_withdrawal", {
      _amount_cfa: data.amount_cfa, _phone: data.phone,
    });
    if (error) throw new Error(error.message);
    return out as { ok: boolean; tx_id?: string; kri?: number; error?: string };
  });

// ---- Admin ----
const adminWithdrawSchema = z.object({ tx_id: z.string().uuid(), approve: z.boolean(), notes: z.string().max(500).optional() });
export const adminProcessWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminWithdrawSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    const { data: out, error } = await sb.rpc("admin_my_process_withdrawal", {
      _tx: data.tx_id, _approve: data.approve, _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    try {
      const { data: tx } = await context.supabase
        .from("transactions").select("user_id, amount_kori, amount_cfa").eq("id", data.tx_id).maybeSingle();
      if (tx) {
        const { sendPushToUser } = await import("./push.server");
        await sendPushToUser(context.supabase as never, tx.user_id, {
          title: data.approve ? "Retrait validé ✅" : "Retrait refusé",
          body: data.approve ? `${tx.amount_cfa} XAF envoyés à ton Mobile Money.` : `Motif : ${data.notes ?? "non précisé"}. Tes ${tx.amount_kori} KRI sont recrédités.`,
          url: "/app",
        });
      }
    } catch (_) { /* push optional */ }
    return out as { ok: boolean; error?: string };
  });

const adminDepositSchema = z.object({ tx_id: z.string().uuid() });
export const adminConfirmDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminDepositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbClient;
    const { data: out, error } = await sb.rpc("admin_my_confirm_deposit", { _tx: data.tx_id });
    if (error) throw new Error(error.message);
    try {
      const { data: tx } = await context.supabase
        .from("transactions").select("user_id, amount_kori").eq("id", data.tx_id).maybeSingle();
      if (tx) {
        const { sendPushToUser } = await import("./push.server");
        await sendPushToUser(context.supabase as never, tx.user_id, { title: "Dépôt crédité ✅", body: `+${tx.amount_kori} KRI ajoutés à ton solde.`, url: "/app" });
      }
    } catch (_) { /* push optional */ }
    return out as { ok: boolean; error?: string };
  });

const blockUserSchema = z.object({ user_id: z.string().uuid(), blocked: z.boolean() });
export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => blockUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles").update({ is_blocked: data.blocked }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
