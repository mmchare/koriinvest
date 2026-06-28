import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useProfile, useTransactions } from "@/hooks/use-kori";
import { fmtKri, fmtXaf, kriToXaf, currencyFor } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Gift, Lock, Users, RefreshCw, Wallet } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

const TX_LABEL: Record<string, string> = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  COMMISSION_DEP: "Commission parrainage",
  COMMISSION_BONUS: "Commission bonus",
  WHEEL_REWARD: "Gain Roue",
  VAULT_LOCK: "Coffre — verrou",
  VAULT_PAYOUT: "Coffre — récolte",
  REFERRAL_BONUS: "Bonus parrainage",
  ONCHAIN_WITHDRAW: "Transfert on-chain",
  ADMIN_ADJUST: "Ajustement admin",
};

function HomePage() {
  const { data: profile, isLoading, refetch } = useProfile();
  const { data: txs } = useTransactions(8);
  const [flipped, setFlipped] = useState(false);
  const currency = currencyFor(profile?.country_code ?? "+237");

  const balanceKri = Number(profile?.kori_balance ?? 0);
  const lockedKri = Number(profile?.kori_locked ?? 0);
  const balanceXaf = kriToXaf(balanceKri);

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Bonjour</p>
          <h1 className="font-display text-lg font-bold">{profile?.display_name ?? "…"}</h1>
        </div>
        <button onClick={() => refetch()} className="w-10 h-10 grid place-items-center rounded-full bg-secondary hover:bg-muted transition" aria-label="Rafraîchir">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <section className="px-5">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full perspective-1000 text-left"
          aria-label="Voir le solde en KORI"
        >
          <div className={`relative preserve-3d transition-transform duration-700 ${flipped ? "rotate-y-180" : ""}`}>
            {/* Front: fiat */}
            <div className="backface-hidden bg-kori-hero text-white rounded-3xl p-6 shadow-kori">
              <p className="text-xs uppercase tracking-widest opacity-80">Solde total</p>
              <p className="font-display text-4xl font-bold mt-1">{isLoading ? "…" : fmtXaf(balanceXaf, currency)}</p>
              <p className="text-xs opacity-80 mt-2">≈ {fmtKri(balanceKri)} • Tap pour voir en KORI</p>
              {lockedKri > 0 && (
                <p className="text-xs mt-3 bg-white/10 inline-block px-2 py-1 rounded-md">
                  🔒 {fmtKri(lockedKri)} bloqués
                </p>
              )}
            </div>
            {/* Back: kri */}
            <div className="absolute inset-0 rotate-y-180 backface-hidden bg-foreground text-background rounded-3xl p-6 shadow-kori">
              <p className="text-xs uppercase tracking-widest opacity-70">Solde KORI</p>
              <p className="font-display text-4xl font-bold mt-1">{fmtKri(balanceKri)}</p>
              <p className="text-xs opacity-70 mt-2">≈ {fmtXaf(balanceXaf, currency)} • Tap pour revenir</p>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link to="/app/deposit" className="bg-kori-gradient text-white rounded-2xl py-4 px-4 flex items-center gap-2 font-semibold shadow-kori active:scale-[0.98] transition">
            <ArrowDownToLine className="w-5 h-5" /> Dépôt
          </Link>
          <Link to="/app/withdraw" className="bg-foreground text-background rounded-2xl py-4 px-4 flex items-center gap-2 font-semibold active:scale-[0.98] transition">
            <ArrowUpFromLine className="w-5 h-5" /> Retrait
          </Link>
        </div>
      </section>

      <section className="px-5 mt-6 grid grid-cols-4 gap-3">
        <ShortcutCard to="/app/wheel" icon={Gift} label="Roue" color="text-[color:var(--kori)]" />
        <ShortcutCard to="/app/vault" icon={Lock} label="Coffre" color="text-[color:var(--kori)]" />
        <ShortcutCard to="/app/referral" icon={Users} label="Parrainer" color="text-[color:var(--kori)]" />
        <ShortcutCard to="/app/wallet" icon={Wallet} label="Wallet" color="text-[color:var(--kori)]" />
      </section>

      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold">Activité récente</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {(txs ?? []).length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune opération pour l'instant.</div>
          )}
          {(txs ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{TX_LABEL[t.type] ?? t.type}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {t.status}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${["WITHDRAWAL","VAULT_LOCK"].includes(t.type) ? "text-foreground" : "text-[color:var(--success)]"}`}>
                  {["WITHDRAWAL","VAULT_LOCK"].includes(t.type) ? "−" : "+"}{fmtKri(Number(t.amount_kori))}
                </p>
                {t.amount_cfa && <p className="text-xs text-muted-foreground">{fmtXaf(Number(t.amount_cfa), currency)}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ShortcutCard({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; color?: string }) {
  return (
    <Link to={to} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-[0.97] transition">
      <div className="w-10 h-10 grid place-items-center rounded-xl bg-kori-soft text-[color:var(--kori-deep)]">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}
