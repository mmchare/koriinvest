import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { initiateWithdrawal } from "@/lib/kori.functions";
import { useProfile } from "@/hooks/use-kori";
import { currencyFor, fmtKri, fmtXaf, kriToXaf, xafToKri } from "@/lib/format";
import { networksFor } from "@/lib/saspay-networks";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/withdraw")({
  component: WithdrawPage,
});

function WithdrawPage() {
  const { data: profile } = useProfile();
  const countryCode = profile?.country_code ?? "+237";
  const currency = currencyFor(countryCode);
  const networks = useMemo(() => networksFor(countryCode), [countryCode]);
  const maxXaf = kriToXaf(Number(profile?.kori_balance ?? 0));
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState(networks[0]?.code ?? "mtn_cm");
  const [loading, setLoading] = useState(false);
  const withdraw = useServerFn(initiateWithdrawal);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const kri = useMemo(() => xafToKri(Number(amount) || 0), [amount]);

  useEffect(() => {
    if (!networks.some((n) => n.code === network)) setNetwork(networks[0]?.code ?? "mtn_cm");
  }, [networks, network]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n < 500) return toast.error("Montant minimum 500");
    if (n > maxXaf) return toast.error("Solde insuffisant");
    if (phone.replace(/\D/g, "").length < 6) return toast.error("Numéro invalide");
    setLoading(true);
    try {
      const r = await withdraw({ data: { amount_cfa: n, phone, network } });
      if (!r.ok) throw new Error(r.error === "insufficient" ? "Solde insuffisant" : "Erreur");
      toast.success("Demande envoyée. Traitement sous 24 h.");
      qc.invalidateQueries();
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setLoading(false); }
  }


  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Retrait</h1>
      </header>
      <form onSubmit={submit} className="px-5 flex-1 flex flex-col gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Solde disponible</p>
          <p className="font-display text-2xl font-bold mt-1">{fmtXaf(maxXaf, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">≈ {fmtKri(Number(profile?.kori_balance ?? 0))}</p>
        </div>
        <Field label={`Montant à retirer en ${currency}`}>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40 text-lg font-semibold" />
          <span className="text-xs text-muted-foreground mt-1">≈ {fmtKri(kri)} seront gelés</span>
        </Field>
        <Field label="Opérateur Mobile Money">
          <div className="grid grid-cols-2 gap-2">
            {networks.map((n) => (
              <button type="button" key={n.code} onClick={() => setNetwork(n.code)}
                className={`rounded-xl py-3 text-sm font-semibold border transition ${network === n.code ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}>
                {n.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Numéro Mobile Money bénéficiaire">
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40" placeholder="6 12 34 56 78" />
        </Field>
        <p className="text-xs text-muted-foreground">Retrait validé par l'équipe (sous 24 h) puis envoyé via SasPay. En cas de refus, les KORI sont restitués.</p>

        <button type="submit" disabled={loading} className="mt-auto mb-2 w-full bg-foreground text-background font-semibold rounded-2xl py-4 disabled:opacity-60 active:scale-[0.98] transition">
          {loading ? "Patientez…" : "Demander le retrait"}
        </button>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>{children}</label>;
}
