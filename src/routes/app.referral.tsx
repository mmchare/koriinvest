import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import { useProfile } from "@/hooks/use-kori";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fmtKri } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/referral")({
  component: ReferralPage,
});

function ReferralPage() {
  const { data: profile } = useProfile();
  const code = profile?.referral_code ?? "—";
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth?mode=signup&ref=${code}` : `https://kori.app/r/${code}`;

  const { data: stats } = useQuery({
    queryKey: ["referral-stats", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ count }, { data: comm }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", profile!.id),
        supabase.from("referral_commissions").select("amount_kori").eq("parrain_id", profile!.id),
      ]);
      const total = (comm ?? []).reduce((s, r) => s + Number(r.amount_kori), 0);
      return { filleuls: count ?? 0, total };
    },
  });

  function copy() {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  }
  function share() {
    const text = `Rejoins-moi sur KORI 🚀 Achète des KRI via Mobile Money et profite de bonus à l'inscription ! ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Parrainage</h1>
      </header>

      <section className="px-5">
        <div className="bg-kori-hero text-white rounded-2xl p-5 shadow-kori">
          <p className="text-xs uppercase tracking-widest opacity-80">Ton code</p>
          <p className="font-display text-3xl font-bold mt-1 tracking-widest">{code}</p>
          <p className="text-xs opacity-85 mt-3">Gagne <strong>5 %</strong> des dépôts et <strong>3 %</strong> des gains de tes filleuls.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={copy} className="bg-card border border-border rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold">
            <Copy className="w-4 h-4" /> Copier
          </button>
          <button onClick={share} className="bg-foreground text-background rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
        </div>

        <div className="mt-4 bg-secondary rounded-xl p-3 text-xs break-all text-muted-foreground">{link}</div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Filleuls</p>
            <p className="font-display text-2xl font-bold mt-1">{stats?.filleuls ?? 0}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Gains totaux</p>
            <p className="font-display text-2xl font-bold mt-1">{fmtKri(stats?.total ?? 0)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
