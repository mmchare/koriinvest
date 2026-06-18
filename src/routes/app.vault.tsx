import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { createVault, claimVault } from "@/lib/kori.functions";
import { useProfile, useVaults } from "@/hooks/use-kori";
import { fmtKri } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/vault")({
  component: VaultPage,
});

const PLANS = [
  { days: 7, rate: 0.015, label: "7 jours", desc: "Court terme" },
  { days: 15, rate: 0.04, label: "15 jours", desc: "Populaire" },
  { days: 30, rate: 0.10, label: "30 jours", desc: "Meilleur rendement" },
] as const;

function VaultPage() {
  const { data: profile } = useProfile();
  const { data: vaults, refetch } = useVaults();
  const [amount, setAmount] = useState("100");
  const [days, setDays] = useState<7 | 15 | 30>(15);
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createVault);
  const claim = useServerFn(claimVault);
  const qc = useQueryClient();
  const [, force] = useState(0);
  useEffect(() => { const i = setInterval(() => force((x) => x + 1), 1000); return () => clearInterval(i); }, []);

  const plan = PLANS.find((p) => p.days === days)!;
  const profit = Math.round(Number(amount || 0) * plan.rate * 10000) / 10000;

  async function onCreate() {
    const n = Number(amount);
    if (!n || n < 10) return toast.error("Minimum 10 KRI");
    if (n > Number(profile?.kori_balance ?? 0)) return toast.error("Solde insuffisant");
    setLoading(true);
    try {
      const r = await create({ data: { amount: n, days } });
      if (!r.ok) throw new Error(r.error);
      toast.success(`Coffre créé ! Profit prévu : ${fmtKri(r.profit ?? 0)}`);
      qc.invalidateQueries(); refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }

  async function onClaim(id: string) {
    try {
      const r = await claim({ data: { vault_id: id } });
      if (!r.ok) throw new Error(r.error);
      toast.success(`+${fmtKri(r.returned ?? 0)} crédités`);
      qc.invalidateQueries(); refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Coffre-fort</h1>
      </header>

      <section className="px-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Disponible</p>
          <p className="font-display text-2xl font-bold mt-1">{fmtKri(Number(profile?.kori_balance ?? 0))}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {PLANS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`rounded-2xl p-3 text-left border transition ${days === p.days ? "border-primary bg-kori-soft" : "border-border bg-card"}`}>
              <p className="font-display font-bold text-sm">{p.label}</p>
              <p className="text-[color:var(--kori-deep)] text-xs font-semibold">+{(p.rate * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Montant à bloquer (KRI)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40 text-lg font-semibold" />
          <span className="text-xs text-muted-foreground">Profit prévu : <strong className="text-[color:var(--success)]">+{fmtKri(profit)}</strong></span>
        </label>

        <button onClick={onCreate} disabled={loading}
          className="mt-4 w-full bg-kori-gradient text-white font-semibold rounded-2xl py-4 shadow-kori disabled:opacity-60 active:scale-[0.98] transition">
          {loading ? "…" : `Bloquer ${amount || 0} KRI · ${plan.label}`}
        </button>
      </section>

      <section className="px-5 mt-7">
        <h2 className="font-display text-base font-bold mb-3">Mes coffres</h2>
        <div className="space-y-2">
          {(vaults ?? []).length === 0 && <p className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-4">Aucun coffre actif.</p>}
          {(vaults ?? []).map((v) => {
            const end = new Date(v.end_date).getTime();
            const mature = end <= Date.now();
            const remaining = Math.max(0, end - Date.now());
            const d = Math.floor(remaining / 86_400_000);
            const h = Math.floor((remaining % 86_400_000) / 3_600_000);
            const m = Math.floor((remaining % 3_600_000) / 60_000);
            return (
              <div key={v.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {v.status === "COMPLETED" ? <CheckCircle2 className="w-4 h-4 text-[color:var(--success)]" /> : <Lock className="w-4 h-4 text-[color:var(--kori)]" />}
                    {fmtKri(Number(v.amount_locked))} · {v.duration_days}j
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profit : +{fmtKri(Number(v.expected_profit))} ·{" "}
                    {v.status === "COMPLETED" ? "Récolté" : mature ? "Prêt !" : `Reste ${d}j ${h}h ${m}m`}
                  </p>
                </div>
                {v.status === "ACTIVE" && mature && (
                  <button onClick={() => onClaim(v.id)} className="bg-kori-gradient text-white text-sm font-semibold rounded-xl px-3 py-2">Récolter</button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
