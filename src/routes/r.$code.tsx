import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => {
    const code = (params.code ?? "").toUpperCase();
    const title = `Rejoins KORI avec le code ${code}`;
    const desc = "Active ton bonus de bienvenue, fais tourner la Roue de la Fortune et fais fructifier tes KRI via Mobile Money.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  component: ReferralLanding,
});

function ReferralLanding() {
  const { code } = Route.useParams();
  const upper = code.toUpperCase();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="text-center">
          <img src="/icon-192.png" alt="KORI" width={80} height={80} className="mx-auto rounded-2xl shadow-lg" />
          <h1 className="font-display text-3xl font-bold mt-4">Tu as été invité 🎁</h1>
          <p className="text-muted-foreground mt-2">Inscris-toi avec le code <span className="font-bold text-foreground">{upper}</span> et reçois un bonus parrainage.</p>
        </div>

        <div className="mt-8 space-y-3">
          <Feature icon={<Gift className="w-5 h-5" />} title="Bonus parrainage" desc="5% sur chaque dépôt + 3% sur les gains de ton parrain." />
          <Feature icon={<Zap className="w-5 h-5" />} title="Roue gratuite chaque jour" desc="Jusqu'à 500 KRI à gagner toutes les 24h." />
          <Feature icon={<ShieldCheck className="w-5 h-5" />} title="Coffre-fort jusqu'à +10%" desc="Bloque tes KRI 7, 15 ou 30 jours et touche les intérêts." />
        </div>

        <Link to="/auth" search={{ mode: "signup", ref: upper }}
          className="mt-8 block w-full text-center bg-kori-gradient text-white font-semibold py-4 rounded-2xl shadow-kori">
          Créer mon compte avec ce code
        </Link>
        <Link to="/auth" search={{ mode: "signin" }} className="mt-3 block text-center text-sm text-muted-foreground underline">
          J'ai déjà un compte
        </Link>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-kori-gradient text-white grid place-items-center shrink-0">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
