import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Wallet, Gift, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KORI — Le portefeuille KRI mobile money" },
      { name: "description", content: "Achetez KORI ($KRI) via Orange Money, MTN MoMo, Wave. Gagnez à la Roue, bloquez dans le Coffre-fort, parrainez vos amis." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md min-h-screen flex flex-col bg-kori-hero text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-black/30 blur-3xl" aria-hidden />

        <header className="relative flex items-center justify-between px-6 pt-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white text-[color:var(--kori)] grid place-items-center font-display font-bold text-lg shadow-kori">K</div>
            <span className="font-display font-bold text-xl tracking-tight">KORI</span>
          </div>
          <span className="text-xs uppercase tracking-widest opacity-80">$KRI</span>
        </header>

        <main className="relative flex-1 px-6 pt-14 pb-10 flex flex-col">
          <h1 className="font-display text-4xl font-bold leading-tight text-balance">
            La crypto, <br /> simple comme<br /> un Mobile Money.
          </h1>
          <p className="mt-4 text-white/85 text-base text-balance">
            Achète, transfère et fais grandir tes <strong>KORI</strong> en quelques secondes,
            depuis Orange Money, MTN MoMo ou Wave.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Feature icon={Wallet} label="Dépôt instantané" />
            <Feature icon={Gift} label="Roue 24 h" />
            <Feature icon={Sparkles} label="Coffre +10%" />
            <Feature icon={ShieldCheck} label="Parrainage 5%" />
          </div>

          <div className="mt-auto pt-10 space-y-3 safe-bottom">
            {loading ? null : user ? (
              <Link to="/app" className="block w-full text-center bg-white text-[color:var(--kori)] font-semibold rounded-2xl py-4 shadow-kori active:scale-[0.98] transition">
                Ouvrir mon portefeuille
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signup" }} className="block w-full text-center bg-white text-[color:var(--kori)] font-semibold rounded-2xl py-4 shadow-kori active:scale-[0.98] transition">
                  Créer un compte
                </Link>
                <Link to="/auth" search={{ mode: "signin" }} className="block w-full text-center bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-2xl py-4 active:scale-[0.98] transition">
                  J'ai déjà un compte
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2.5 border border-white/15">
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
