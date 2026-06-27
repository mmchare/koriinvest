import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminProcessWithdrawal, adminConfirmDeposit, adminBlockUser } from "@/lib/kori.functions";
import { adminAdjustBalance } from "@/lib/admin.functions";
import { adminBroadcastPush } from "@/lib/push.functions";
import { fmtKri, fmtXaf } from "@/lib/format";
import { ArrowLeft, Check, X, Search, Ban, Unlock, Sliders, Send, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/app" });
  },
  component: AdminPage,
});

function AdminPage() {
  const [tab, setTab] = useState<"withdrawals" | "deposits" | "users" | "finance">("withdrawals");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <header className="flex items-center gap-3 mb-4">
          <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-display text-2xl font-bold">Administration</h1>
        </header>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {([
            ["withdrawals", "Retraits"],
            ["deposits", "Dépôts"],
            ["finance", "Finances"],
            ["users", "Utilisateurs"],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === k ? "bg-kori-gradient text-white shadow-kori" : "bg-card border border-border"}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === "withdrawals" && <Withdrawals />}
        {tab === "deposits" && <Deposits />}
        {tab === "finance" && <Finance />}
        {tab === "users" && <Users />}
      </div>
    </div>
  );
}

function Withdrawals() {
  const qc = useQueryClient();
  const process = useServerFn(adminProcessWithdrawal);
  const { data } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*, profiles!inner(display_name,phone_number)")
        .eq("type", "WITHDRAWAL").eq("status", "PENDING").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  async function handle(tx_id: string, approve: boolean) {
    let notes = "";
    if (!approve) {
      notes = window.prompt("Motif du refus ?") ?? "";
      if (!notes.trim()) return;
    }
    try {
      await process({ data: { tx_id, approve, notes } });
      toast.success(approve ? "Retrait validé" : "Retrait refusé");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>}
      {(data ?? []).map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{(t as { profiles?: { display_name?: string } }).profiles?.display_name ?? "—"} · {fmtXaf(Number(t.amount_cfa))}</p>
            <p className="text-xs text-muted-foreground">{fmtKri(Number(t.amount_kori))} → {t.recipient_phone} · {new Date(t.created_at).toLocaleString("fr-FR")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handle(t.id, true)} className="bg-[color:var(--success)] text-white rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold"><Check className="w-4 h-4" /> Valider</button>
            <button onClick={() => handle(t.id, false)} className="bg-foreground text-background rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold"><X className="w-4 h-4" /> Refuser</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Deposits() {
  const qc = useQueryClient();
  const confirm = useServerFn(adminConfirmDeposit);
  const { data } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*, profiles!inner(display_name,phone_number)")
        .eq("type", "DEPOSIT").eq("status", "PENDING").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  async function handle(tx_id: string) {
    try {
      await confirm({ data: { tx_id } });
      toast.success("Dépôt crédité (+commission parrainage)");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">En attendant l'intégration NotchPay, valide manuellement les dépôts confirmés côté Mobile Money.</p>
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun dépôt en attente.</p>}
      {(data ?? []).map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{(t as { profiles?: { display_name?: string } }).profiles?.display_name ?? "—"} · {fmtXaf(Number(t.amount_cfa))}</p>
            <p className="text-xs text-muted-foreground">→ {fmtKri(Number(t.amount_kori))} · depuis {t.recipient_phone} · {new Date(t.created_at).toLocaleString("fr-FR")}</p>
          </div>
          <button onClick={() => handle(t.id)} className="bg-kori-gradient text-white rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold shadow-kori"><Check className="w-4 h-4" /> Créditer</button>
        </div>
      ))}
    </div>
  );
}

function Finance() {
  const { data } = useQuery({
    queryKey: ["admin-finance"],
    queryFn: async () => {
      const [{ data: profiles }, { data: deposits }, { data: withdrawals }] = await Promise.all([
        supabase.from("profiles").select("kori_balance,kori_locked"),
        supabase.from("transactions").select("amount_cfa,amount_kori").eq("type", "DEPOSIT").eq("status", "SUCCESS"),
        supabase.from("transactions").select("amount_cfa,amount_kori").eq("type", "WITHDRAWAL").eq("status", "SUCCESS"),
      ]);
      const circulating = (profiles ?? []).reduce((s, p) => s + Number(p.kori_balance), 0);
      const locked = (profiles ?? []).reduce((s, p) => s + Number(p.kori_locked), 0);
      const depTotal = (deposits ?? []).reduce((s, t) => s + Number(t.amount_cfa ?? 0), 0);
      const wTotal = (withdrawals ?? []).reduce((s, t) => s + Number(t.amount_cfa ?? 0), 0);
      return { circulating, locked, depTotal, wTotal, users: profiles?.length ?? 0 };
    },
  });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Utilisateurs" v={String(data?.users ?? 0)} />
      <Stat label="KRI en circulation" v={fmtKri(data?.circulating ?? 0)} />
      <Stat label="KRI bloqués" v={fmtKri(data?.locked ?? 0)} />
      <Stat label="Volume dépôts" v={fmtXaf(data?.depTotal ?? 0)} />
      <Stat label="Volume retraits" v={fmtXaf(data?.wTotal ?? 0)} />
    </div>
  );
}
function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-xl font-bold mt-1">{v}</p>
    </div>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const block = useServerFn(adminBlockUser);
  const { data } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (q) query = query.or(`phone_number.ilike.%${q}%,display_name.ilike.%${q}%,referral_code.ilike.%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });
  async function toggle(id: string, blocked: boolean) {
    try {
      await block({ data: { user_id: id, blocked } });
      toast.success(blocked ? "Compte bloqué" : "Compte débloqué");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  return (
    <div className="space-y-2">
      <div className="bg-secondary rounded-xl flex items-center gap-2 px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, tél, code)" className="flex-1 bg-transparent outline-none text-sm" />
      </div>
      {(data ?? []).map((u) => (
        <div key={u.id} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{u.display_name} {u.is_blocked && <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">bloqué</span>}</p>
            <p className="text-xs text-muted-foreground">{u.phone_number} · {u.referral_code} · {fmtKri(Number(u.kori_balance))}</p>
          </div>
          <button onClick={() => toggle(u.id, !u.is_blocked)} className="text-sm font-semibold px-3 py-2 rounded-xl bg-secondary hover:bg-muted flex items-center gap-1">
            {u.is_blocked ? <><Unlock className="w-4 h-4" /> Débloquer</> : <><Ban className="w-4 h-4" /> Bloquer</>}
          </button>
        </div>
      ))}
    </div>
  );
}
