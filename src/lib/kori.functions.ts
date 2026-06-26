import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function enforceRateLimit(userId: string, action: string, max: number, windowSeconds: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit" as never, {
    _user: userId, _action: action, _max: max, _window_seconds: windowSeconds,
  } as never);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Trop de tentatives, réessaie dans quelques instants.");
}

// ---- Wheel ----
export const spinWheel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await enforceRateLimit(context.userId, "spin_wheel", 3, 60);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("spin_wheel" as never, { _user: context.userId } as never);
    if (error) throw new Error(error.message);
    return data as { ok: boolean; reward_type?: string; reward?: number; error?: string; next_at?: string };
  });

// ---- Vault ----
const createVaultSchema = z.object({ amount: z.number().positive(), days: z.union([z.literal(7), z.literal(15), z.literal(30)]) });
export const createVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createVaultSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: out, error } = await supabaseAdmin.rpc("create_vault" as never, {
      _user: context.userId, _amount: data.amount, _days: data.days,
    } as never);
    if (error) throw new Error(error.message);
    return out as { ok: boolean; vault_id?: string; profit?: number; error?: string };
  });

const claimVaultSchema = z.object({ vault_id: z.string().uuid() });
export const claimVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => claimVaultSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: out, error } = await supabaseAdmin.rpc("claim_vault" as never, {
      _user: context.userId, _vault: data.vault_id,
    } as never);
    if (error) throw new Error(error.message);
    return out as { ok: boolean; returned?: number; error?: string };
  });

// ---- Deposit (mock NotchPay - creates PENDING tx) ----
const depositSchema = z.object({
  amount_cfa: z.number().positive().max(10_000_000),
  phone: z.string().min(6).max(20),
});
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
// ---- Deposit (NotchPay if NOTCHPAY_PUBLIC_KEY set, else mock PENDING tx) ----
const depositSchema = z.object({
  amount_cfa: z.number().positive().max(10_000_000),
  phone: z.string().min(6).max(20),
});
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depositSchema.parse(d))
  .handler(async ({ data, context }) => {
    await enforceRateLimit(context.userId, "deposit_init", 5, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin.from("app_config").select("value").eq("key", "kri_per_xaf").maybeSingle();
    const rate = Number(cfg?.value ?? 0.1);
    const kri = Math.round(data.amount_cfa * rate * 10000) / 10000;

    const notchKey = process.env.NOTCHPAY_PUBLIC_KEY;
    let providerRef: string | null = null;
    let authorizationUrl: string | null = null;

    if (notchKey) {
      // Get user email for NotchPay (required)
      const { data: profile } = await supabaseAdmin.from("profiles").select("phone_number, display_name").eq("id", context.userId).maybeSingle();
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

    const { data: tx, error } = await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      type: "DEPOSIT",
      amount_cfa: data.amount_cfa,
      amount_kori: kri,
      status: "PENDING",
      recipient_phone: data.phone,
      provider_reference: providerRef,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, tx_id: tx.id, kri, authorization_url: authorizationUrl };
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
    await enforceRateLimit(context.userId, "withdraw_init", 3, 600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: out, error } = await supabaseAdmin.rpc("initiate_withdrawal" as never, {
      _user: context.userId, _amount_cfa: data.amount_cfa, _phone: data.phone,
    } as never);
    if (error) throw new Error(error.message);
    return out as { ok: boolean; tx_id?: string; kri?: number; error?: string };
  });

// ---- Admin ----
const adminWithdrawSchema = z.object({ tx_id: z.string().uuid(), approve: z.boolean(), notes: z.string().max(500).optional() });
export const adminProcessWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminWithdrawSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { data: out, error } = await supabaseAdmin.rpc("admin_process_withdrawal" as never, {
      _admin: context.userId, _tx: data.tx_id, _approve: data.approve, _notes: data.notes ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return out as { ok: boolean; error?: string };
  });

const adminDepositSchema = z.object({ tx_id: z.string().uuid() });
export const adminConfirmDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminDepositSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { data: out, error } = await supabaseAdmin.rpc("admin_confirm_deposit" as never, {
      _admin: context.userId, _tx: data.tx_id,
    } as never);
    if (error) throw new Error(error.message);
    return out as { ok: boolean; error?: string };
  });

const blockUserSchema = z.object({ user_id: z.string().uuid(), blocked: z.boolean() });
export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => blockUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("profiles").update({ is_blocked: data.blocked }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
