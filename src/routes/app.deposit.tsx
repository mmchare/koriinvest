import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { initiateDeposit } from "@/lib/kori.functions";
import { useProfile } from "@/hooks/use-kori";
import { currencyFor, fmtKri, xafToKri } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const { data: profile } = useProfile();
  const currency = currencyFor(profile?.country_code ?? "+237");
  const [amount, setAmount] = useState<string>("2500");
  const [phone, setPhone] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const deposit = useServerFn(initiateDeposit);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const kri = useMemo(() => xafToKri(Number(amount) || 0), [amount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n < 500) return toast.error("Montant minimum 500");
    if (phone.replace(/\D/g, "").length < 6) return toast.error("Numéro Mobile Money invalide");
    setLoading(true);
    try {
      const r = await deposit({ data: { amount_cfa: n, phone } });
      if (!r.ok) throw new Error(r.kri ? "Erreur" : "Erreur");
      toast.success("Demande envoyée. Validez le paiement sur votre téléphone.");
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
        <h1 className="font-display text-xl font-bold">Dépôt</h1>
      </header>

      <form onSubmit={submit} className="px-5 flex-1 flex flex-col gap-4">
        <div className="bg-kori-hero text-white rounded-2xl p-5 shadow-kori">
          <p className="text-xs uppercase tracking-widest opacity-80">Vous allez recevoir</p>
          <p className="font-display text-3xl font-bold mt-1">{fmtKri(kri)}</p>
          <p className="text-xs opacity-80 mt-1">au taux 1 KRI = 10 {currency}</p>
        </div>

        <Field label={`Montant en ${currency}`}>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40 text-lg font-semibold" />
        </Field>

        <div className="grid grid-cols-4 gap-2">
          {[1000, 2500, 5000, 10000].map((v) => (
            <button type="button" key={v} onClick={() => setAmount(String(v))} className="bg-secondary rounded-xl py-2 text-sm font-medium hover:bg-muted">
              {v.toLocaleString("fr-FR")}
            </button>
          ))}
        </div>

        <Field label="Numéro Mobile Money">
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40" placeholder="6 12 34 56 78" />
        </Field>

        <p className="text-xs text-muted-foreground">
          Paiement sécurisé via Orange Money, MTN MoMo, Wave (NotchPay).
        </p>

        <button type="submit" disabled={loading} className="mt-auto mb-2 w-full bg-kori-gradient text-white font-semibold rounded-2xl py-4 shadow-kori disabled:opacity-60 active:scale-[0.98] transition">
          {loading ? "Patientez…" : `Payer ${Number(amount || 0).toLocaleString("fr-FR")} ${currency}`}
        </button>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>{children}</label>;
}
