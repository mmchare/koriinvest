import {
  Coins,
  Gift,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

/* ---------- S1 — Titre ---------- */
export function SlideTitle() {
  return (
    <div className="relative h-full flex flex-col justify-center px-24">
      <Glow className="-top-40 -right-40 opacity-70" />
      <div className="slide-kicker slide-accent mb-8">Pitch investisseurs · 2026</div>
      <h1 className="slide-title-lg">
        KORI <span className="slide-accent">($KRI)</span>
      </h1>
      <p className="slide-subtitle slide-dim mt-8 max-w-[1250px]">
        La banque d'épargne gamifiée de l'Afrique de l'Ouest et du Centrale —
        adossée au Mobile Money, propulsée par Solana.
      </p>
      <div className="flex gap-5 mt-14">
        <span className="slide-pill slide-badge">XOF · XAF</span>
        <span className="slide-pill slide-badge">Token Solana SPL</span>
        <span className="slide-pill slide-badge">Mobile Money</span>
        <span className="slide-pill slide-badge">PWA installable</span>
      </div>
      <div className="slide-caption slide-dim mt-16">koriinvest.lovable.app</div>
    </div>
  );
}

/* ---------- S2 — Problème ---------- */
export function SlideProblem() {
  const items = [
    {
      icon: Smartphone,
      t: "Le Mobile Money déplace l'argent, il ne le fait pas fructifier",
      d: "Le portefeuille mobile est devenu le réflexe de paiement, mais le solde y dort : aucun rendement, aucune croissance.",
    },
    {
      icon: Landmark,
      t: "L'épargne classique reste hors de portée",
      d: "Dépôts minimum élevés, files d'attente en agence, paperasse : l'épargne formelle ignore la majorité des actifs de la zone.",
    },
    {
      icon: TrendingUp,
      t: "L'inflation ronge le franc CFA",
      d: "Garder du cash « sous le matelas », c'est perdre du pouvoir d'achat chaque année — sans alternative simple à portée de main.",
    },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Le problème</div>
        <h1 className="slide-title-md">Des milliards de FCFA qui dorment</h1>
      </div>
      <div className="px-20 mt-12 grid grid-cols-3 gap-8">
        {items.map((it) => (
          <div key={it.t} className="slide-card p-10 flex flex-col min-h-[560px]">
            <it.icon className="slide-accent mb-8" size={56} strokeWidth={1.8} />
            <div className="slide-body-lg font-semibold mb-6">{it.t}</div>
            <p className="slide-body slide-dim">{it.d}</p>
          </div>
        ))}
      </div>
      <div className="px-20 mt-12">
        <div className="slide-body-lg">
          Le résultat : les utilisateurs empilent, dépensent, re-remplissent —{" "}
          <span className="slide-accent font-semibold">et ne construisent jamais de patrimoine.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- S3 — Pourquoi la crypto ---------- */
export function SlideWhyCrypto() {
  const items = [
    {
      icon: Globe2,
      t: "Des transferts instantanés, sans frontières",
      d: "Envoyer de la valeur entre Abidjan, Douala, Paris ou Dubaï en quelques secondes, pour des frais de quelques centimes.",
    },
    {
      icon: Sparkles,
      t: "Une monnaie programmable",
      d: "Rendements, échéances, bonus, commissions : toute la mécanique de KORI est du code vérifiable, pas des promesses papier.",
    },
    {
      icon: ShieldCheck,
      t: "Une propriété souveraine",
      d: "Chaque utilisateur détient son actif dans son propre wallet Solana — personne ne peut geler ou bloquer son épargne.",
    },
    {
      icon: Zap,
      t: "Un marché ouvert 24 h/24",
      d: "Liquidité mondiale, transparence publique sur la blockchain, et une infrastructure (Solana) au coût négligeable par transaction.",
    },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Pourquoi la crypto compte</div>
        <h1 className="slide-title-md">La crypto ne remplace pas le Mobile Money.</h1>
      </div>
      <div className="px-20 -mt-2">
        <p className="slide-subtitle slide-dim">Elle le connecte au monde.</p>
      </div>
      <div className="px-20 mt-10 grid grid-cols-2 gap-7">
        {items.map((it) => (
          <div key={it.t} className="slide-card p-9 flex gap-7 items-start">
            <div className="slide-pill shrink-0 mt-1 p-3">
              <it.icon size={30} strokeWidth={1.8} />
            </div>
            <div>
              <div className="slide-body-lg font-semibold mb-3">{it.t}</div>
              <p className="slide-body slide-dim">{it.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- S4 — Solution ---------- */
export function SlideSolution() {
  const items = [
    {
      icon: Wallet,
      t: "Dépôts & retraits en Mobile Money",
      d: "XOF/XAF via SasPay : Wave, Orange, MTN, Moov, Djamo, cartes. Cash entrant et sortant, sans friction.",
    },
    {
      icon: Coins,
      t: "Solde Magique KRI ⇄ FIAT",
      d: "Une carte 3D qui bascule visuellement entre le franc CFA et le $KRI : la crypto devient lisible pour tout le monde.",
    },
    {
      icon: Lock,
      t: "Coffres-forts verrouillés",
      d: "Épargne bloquée 7 / 15 / 30 jours → rendement 15 % / 30 % / 60 %, payé en $KRI à l'échéance.",
    },
    {
      icon: Gift,
      t: "Roue de la Fortune quotidienne",
      d: "Un tour par 24 h, gains en $KRI, confettis : une habitude d'ouverture quotidienne, un acquis viral.",
    },
    {
      icon: Users,
      t: "Parrainage WhatsApp",
      d: "Lien profond de partage, commission sur les dépôts des filleuls : chaque client devient un canal d'acquisition.",
    },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">La solution</div>
        <h1 className="slide-title-md">KORI : l'épargne qui ressemble à une app qu'on ouvre chaque jour</h1>
      </div>
      <div className="px-20 mt-10 flex flex-col gap-5">
        {items.map((it) => (
          <div key={it.t} className="slide-card px-9 py-6 flex gap-7 items-center">
            <div className="slide-pill shrink-0 p-3">
              <it.icon size={28} strokeWidth={1.8} />
            </div>
            <div>
              <span className="slide-body-lg font-semibold">{it.t} — </span>
              <span className="slide-body slide-dim">{it.d}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- S5 — Produit live ---------- */
export function SlideProduct() {
  const done = [
    "Inscription au téléphone + confirmation du numéro en double saisie",
    "Connexion biométrique (WebAuthn) et authentification à deux facteurs",
    "Dépôts & retraits SasPay : Mobile Money et cartes, webhook de crédit automatique",
    "Wallet Solana auto-généré, chiffré, avec identité on-chain (Metaplex)",
    "Coffres-forts 15 / 30 / 60 %, Roue de la Fortune, commissions de parrainage",
    "Notifications push, installation en un clic, fonctionnement hors connexion",
  ];
  const solid = [
    "Base de données avec règles d'accès ligne par ligne (RLS) durcies",
    "Fonctions financières atomiques : chaque opération est tout-ou-rien",
    "Rate limiting sur les gains et les dépôts pour bloquer les abus",
    "Console admin : transactions, trésorerie, ajustements, airdrops",
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Ce qui est déjà construit</div>
        <div className="flex items-center gap-6">
          <h1 className="slide-title-md">Un produit complet, pas une maquette</h1>
          <span className="slide-pill slide-badge">Live aujourd'hui</span>
        </div>
      </div>
      <div className="px-20 mt-12 grid grid-cols-2 gap-8">
        <div className="slide-card p-10">
          <div className="slide-body-lg font-semibold slide-accent mb-7">Expérience utilisateur</div>
          <ul className="flex flex-col gap-5">
            {done.map((f) => (
              <li key={f} className="slide-body flex gap-4 items-start">
                <span className="mt-1 text-[var(--slide-success)]">✓</span>
                <span className="slide-dim">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="slide-card p-10">
          <div className="slide-body-lg font-semibold slide-accent mb-7">Fondations techniques</div>
          <ul className="flex flex-col gap-5">
            {solid.map((f) => (
              <li key={f} className="slide-body flex gap-4 items-start">
                <span className="mt-1 text-[var(--slide-success)]">✓</span>
                <span className="slide-dim">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- S6 — $KRI ---------- */
export function SlideToken() {
  const items = [
    {
      icon: Lock,
      t: "Le moteur des coffres-forts",
      d: "Les rendements de 15 à 60 % sont payés en $KRI : la demande d'épargne crée la demande du token.",
    },
    {
      icon: Gift,
      t: "La récompense quotidienne",
      d: "La Roue de la Fortune distribue des $KRI chaque jour : acquisition, rétention et distribution de masse.",
    },
    {
      icon: Users,
      t: "Les commissions de parrainage",
      d: "Le programme d'affiliation est payé en $KRI : chaque membre ambassadeur rémunère son réseau.",
    },
    {
      icon: QrCode,
      t: "Un vrai actif on-chain",
      d: "Token SPL Solana, métadonnées Metaplex : nom KORI et logo visibles dans Phantom et Solscan, transférable vers tout wallet.",
    },
  ];
  return (
    <div className="relative h-full">
      <Glow className="-bottom-64 -left-52 opacity-50" />
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Le token $KRI</div>
        <h1 className="slide-title-md">Un token avec un travail à faire, pas un flyer</h1>
      </div>
      <div className="px-20 mt-12 grid grid-cols-2 gap-7">
        {items.map((it) => (
          <div key={it.t} className="slide-card p-9 flex gap-7 items-start">
            <div className="slide-pill shrink-0 mt-1 p-3">
              <it.icon size={30} strokeWidth={1.8} />
            </div>
            <div>
              <div className="slide-body-lg font-semibold mb-3">{it.t}</div>
              <p className="slide-body slide-dim">{it.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-20 mt-10">
        <div className="slide-body slide-dim">
          Chaque flux produit de l'usage → l'usage alimente la trésorerie → la trésorerie soutient l'économie du token.
        </div>
      </div>
    </div>
  );
}

/* ---------- S7 — Business model ---------- */
export function SlideBusiness() {
  const items = [
    {
      icon: Wallet,
      t: "Commissions sur les dépôts",
      d: "Marge sur chaque passage de FCFA vers $KRI, collectée à l'entrée du flux.",
    },
    {
      icon: TrendingUp,
      t: "Frais sur les retraits",
      d: "Frais de payout vers le Mobile Money, monétisés à la sortie du flux.",
    },
    {
      icon: Coins,
      t: "Marge sur les conversions",
      d: "Écart entre le taux interne KRI/FIAT et le marché, à chaque échange.",
    },
    {
      icon: Target,
      t: "Croissance à la performance",
      d: "Le parrainage rémunère les utilisateurs avec les gains de l'app : le marketing est payé par les revenus, jamais à perte.",
    },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Business model</div>
        <h1 className="slide-title-md">Comment KORI gagne de l'argent</h1>
      </div>
      <div className="px-20 mt-12 grid grid-cols-4 gap-7">
        {items.map((it) => (
          <div key={it.t} className="slide-card p-8 flex flex-col min-h-[430px]">
            <it.icon className="slide-accent mb-7" size={48} strokeWidth={1.8} />
            <div className="slide-body-lg font-semibold mb-4">{it.t}</div>
            <p className="slide-body slide-dim">{it.d}</p>
          </div>
        ))}
      </div>
      <div className="px-20 mt-10 flex gap-5 items-center">
        <span className="slide-pill slide-badge">Hypothèses de taux — à valider avec les partenaires</span>
        <span className="slide-body slide-dim">Plus le volume de dépôts croît, plus la trésorerie $KRI devient un actif stratégique.</span>
      </div>
    </div>
  );
}

/* ---------- S8 — Scénarios financiers ---------- */
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
function fmtBig(v: number) {
  if (v >= 1_000_000_000) return `${fmt(Math.round((v / 1_000_000_000) * 10) / 10)} Md FCFA`;
  if (v >= 1_000_000) return `${fmt(Math.round(v / 1_000_000))} M FCFA`;
  return `${fmt(v)} FCFA`;
}
export function SlideScenarios() {
  const scenarios = [
    {
      name: "Prudent",
      users: 10_000,
      volume: 60_000_000,
      rate: 0.006,
      aum: 150_000_000,
      tone: "Ralentissement : acquisition lente, réglementation exigeante.",
    },
    {
      name: "Réaliste",
      users: 50_000,
      volume: 400_000_000,
      rate: 0.01,
      aum: 900_000_000,
      tone: "Trajectoire de base : parrainage + produit au rythme actuel.",
    },
    {
      name: "Optimiste",
      users: 150_000,
      volume: 1_500_000_000,
      rate: 0.015,
      aum: 3_000_000_000,
      tone: "Effet viral + nouveaux pays : la boucle s'accélère d'elle-même.",
    },
  ];
  const rows: { label: string; get: (s: (typeof scenarios)[0]) => string; strong?: boolean }[] = [
    { label: "Utilisateurs (12 mois)", get: (s) => `${fmt(s.users)}` },
    { label: "Volume de dépôts / mois", get: (s) => fmtBig(s.volume) },
    { label: "Commission nette", get: (s) => `${(s.rate * 100).toFixed(1).replace(".", ",")} %` },
    { label: "Revenus annuels", get: (s) => fmtBig(s.volume * s.rate * 12), strong: true },
    { label: "Épargne sous gestion", get: (s) => fmtBig(s.aum), strong: true },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Scénarios financiers</div>
        <div className="flex items-center gap-6">
          <h1 className="slide-title-md">Trois trajectoires, une même mécanique</h1>
          <span className="slide-pill slide-badge">Hypothèses de travail — à valider ensemble</span>
        </div>
      </div>
      <div className="px-20 mt-10 grid grid-cols-3 gap-7">
        {scenarios.map((s) => (
          <div key={s.name} className="slide-card p-8 flex flex-col">
            <div className="slide-subtitle mb-6">{s.name}</div>
            <div className="flex flex-col gap-4">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between items-baseline gap-4">
                  <span className="slide-caption slide-dim">{r.label}</span>
                  <span className={`slide-caption ${r.strong ? "slide-accent font-semibold" : ""}`}>{r.get(s)}</span>
                </div>
              ))}
            </div>
            <p className="slide-caption slide-dim mt-auto pt-6">{s.tone}</p>
          </div>
        ))}
      </div>
      <div className="px-20 mt-8">
        <div className="slide-caption slide-dim">
          Formule : Utilisateurs actifs × Volume de dépôts mensuel × Commission nette. Par-dessus : la valeur de la trésorerie
          $KRI croît avec chaque utilisateur qui épargne.
        </div>
      </div>
    </div>
  );
}

/* ---------- S9 — Marché & différenciation ---------- */
export function SlideMarket() {
  const comp = [
    { t: "Banques & neobanques", d: "Fiables mais sans rendement accessible ni instantanéité crypto." },
    { t: "Wallets crypto purs", d: "Puissants mais illisibles pour le grand public, et déconnectés du cash local." },
    { t: "Apps d'épargne locales", d: "Ferme le cercle du cash, mais pas de propriété on-chain ni de viralité." },
  ];
  return (
    <div className="relative h-full">
      <Glow className="-top-64 -right-52 opacity-40" />
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Marché</div>
        <h1 className="slide-title-md">≈ 200 millions d'habitants dans la zone XOF / XAF (14 pays)</h1>
      </div>
      <div className="px-20 mt-10 grid grid-cols-2 gap-8">
        <div className="slide-card p-9">
          <div className="slide-body-lg font-semibold mb-6">Ce que KORI fait différemment</div>
          <ul className="flex flex-col gap-4">
            <li className="slide-body flex gap-4"><span className="slide-accent">→</span><span className="slide-dim">La crypto invisible : l'utilisateur épargne, il ne « trade » pas.</span></li>
            <li className="slide-body flex gap-4"><span className="slide-accent">→</span><span className="slide-dim">La gamification comme acquisition : roue, gains, habitude quotidienne.</span></li>
            <li className="slide-body flex gap-4"><span className="slide-accent">→</span><span className="slide-dim">Le parrainage WhatsApp : acquisition organique à coût marginal nul.</span></li>
            <li className="slide-body flex gap-4"><span className="slide-accent">→</span><span className="slide-dim">Un token avec identité on-chain publique, pas une monnaie interne fermée.</span></li>
          </ul>
        </div>
        <div className="flex flex-col gap-5">
          {comp.map((c) => (
            <div key={c.t} className="slide-card px-8 py-6">
              <div className="slide-body-lg font-semibold">{c.t}</div>
              <p className="slide-body slide-dim mt-2">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-20 mt-9">
        <div className="slide-body slide-dim flex items-center gap-4">
          <MapPin className="slide-accent" size={30} />
          Premier marché : Cameroun et zone CEMAC, extension UEMOA dès la traction locale prouvée.
        </div>
      </div>
    </div>
  );
}

/* ---------- S10 — Roadmap ---------- */
export function SlideRoadmap() {
  const cols = [
    {
      icon: ShieldCheck,
      t: "Prochaines 90 jours",
      items: ["Conformité : KYC léger, limites de retrait, CGU", "OTP par SMS sur les opérations sensibles", "Premiers 1 000 utilisateurs en zone test"],
    },
    {
      icon: Rocket,
      t: "6 à 12 mois",
      items: ["Mainnet Solana : trésorerie et airdrops on-chain", "Listing du $KRI sur les DEX et traqueurs publics", "Classements, quêtes, récompenses multi-niveaux"],
    },
    {
      icon: Globe2,
      t: "12 mois et +",
      items: ["Extension UEMOA (Côte d'Ivoire, Sénégal, Bénin)", "Multi-chaînes et carte prépayée adossée au $KRI", "Partenariats opérateurs Mobile Money directs"],
    },
  ];
  return (
    <div>
      <div className="px-20 pt-16">
        <div className="slide-kicker slide-accent mb-5">Roadmap</div>
        <h1 className="slide-title-md">Du produit fini au mouvement régional</h1>
      </div>
      <div className="px-20 mt-12 grid grid-cols-3 gap-7">
        {cols.map((c) => (
          <div key={c.t} className="slide-card p-9 flex flex-col min-h-[480px]">
            <div className="slide-pill self-start p-3 mb-7">
              <c.icon size={30} strokeWidth={1.8} />
            </div>
            <div className="slide-body-lg font-semibold mb-7">{c.t}</div>
            <ul className="flex flex-col gap-5">
              {c.items.map((i) => (
                <li key={i} className="slide-body flex gap-4 items-start">
                  <span className="slide-accent">•</span>
                  <span className="slide-dim">{i}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- S11 — L'ask ---------- */
export function SlideAsk() {
  const funds = [
    { t: "Conformité & sécurité", d: "KYC, SMS OTP, audits : transformer la confiance en barrière à l'entrée." },
    { t: "Acquisition", d: "Financer les primes de parrainage et le marketing local (affichage, radio, campus)." },
    { t: "Trésorerie $KRI", d: "Constituer la réserve qui garantit coffres, roue et commissions dès le premier jour." },
    { t: "Équipe & opérations", d: "Ingénierie, support client 24/7, partenariats opérateurs et SasPay." },
  ];
  return (
    <div className="relative h-full flex flex-col justify-center px-24">
      <Glow className="-top-56 -left-40 opacity-50" />
      <div className="slide-kicker slide-accent mb-6">L'ask</div>
      <h1 className="slide-title">
        Rejoignez la première banque d'épargne <span className="slide-accent">gamifiée</span> de la zone CFA
      </h1>
      <div className="mt-10">
        <div className="slide-body-lg">
          Levée d'amorçage : <span className="slide-accent font-semibold">[MONTANT À VALIDER]</span> pour 18 mois de piste.
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6 mt-12">
        {funds.map((f) => (
          <div key={f.t} className="slide-card p-7">
            <div className="slide-body font-semibold mb-3">{f.t}</div>
            <p className="slide-caption slide-dim">{f.d}</p>
          </div>
        ))}
      </div>
      <div className="slide-body slide-dim mt-12">
        Contact : <span className="slide-accent">[TON EMAIL / WHATSAPP]</span> · koriinvest.lovable.app
      </div>
    </div>
  );
}
