import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Wallet } from "lucide-react";
import { getMyWallet, convertToOnchain } from "@/lib/solana.functions";
import { useProfile } from "@/hooks/use-kori";
import { fmtKri } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/wallet")({
  ssr: false,
  component: WalletPage,
});

function WalletPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyWallet);
  const convertFn = useServerFn(convertToOnchain);
  const { data: wallet, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["my-wallet"],
    queryFn: () => getFn(),
    retry: false,
  });
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const explorer = wallet?.network === "mainnet-beta"
    ? `https://solscan.io/account/${wallet?.pubkey}`
    : `https://solscan.io/account/${wallet?.pubkey}?cluster=devnet`;

  async function copy() {
    if (!wallet?.pubkey) return;
    await navigator.clipboard.writeText(wallet.pubkey);
    toast.success("Adresse copiée");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Montant invalide");
    if (n > Number(profile?.kori_balance ?? 0)) return toast.error("Solde insuffisant");
    setBusy(true);
    try {
      const r = await convertFn({ data: { amount: n } });
      toast.success(`Transfert on-chain réussi 🚀`);
      setAmount("");
      qc.invalidateQueries();
      console.log("tx signature:", r.signature);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Mon Wallet $KRI</h1>
      </header>

      <section className="px-5 space-y-4 pb-6">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {wallet && (
          <>
            <div className="bg-kori-gradient text-white rounded-2xl p-5 shadow-kori">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
                <Wallet className="w-4 h-4" /> Adresse Solana ({wallet.network})
              </div>
              <p className="font-mono text-sm mt-2 break-all">{wallet.pubkey}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={copy} className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copier</button>
                <a href={explorer} target="_blank" rel="noreferrer" className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Explorer</a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase">Solde KORI (DB)</p>
                <p className="font-display text-xl font-bold mt-1">{fmtKri(Number(profile?.kori_balance ?? 0))}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase">Solde on-chain</p>
                <p className="font-display text-xl font-bold mt-1">{fmtKri(wallet.onchain_balance)}</p>
              </div>
            </div>

            {!wallet.configured ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm">
                Le token $KRI n'est pas encore déployé. La conversion sera disponible dès que l'admin aura mint le token.
              </div>
            ) : (
              <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold">Convertir mes KRI en token on-chain</h3>
                <input
                  inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Montant en KRI"
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Le solde sera transféré depuis le pool KORI vers ton wallet Solana. Action irréversible.
                </p>
                <button type="submit" disabled={busy} className="w-full bg-foreground text-background font-semibold rounded-xl py-3 disabled:opacity-60">
                  {busy ? "Transfert en cours…" : "Convertir en on-chain"}
                </button>
              </form>
            )}

            <div className="bg-secondary rounded-2xl p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">⚠️ Sécurité</p>
              Ta clé privée est chiffrée et stockée par KORI (mode custodial). En V2 nous proposerons une option self-custody (export de la phrase secrète).
            </div>
          </>
        )}
      </section>
    </div>
  );
}
