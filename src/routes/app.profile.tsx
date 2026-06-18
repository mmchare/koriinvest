import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Shield } from "lucide-react";
import { useProfile, useIsAdmin } from "@/hooks/use-kori";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" } });
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Mon profil</h1>
      </header>

      <section className="px-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-kori-gradient text-white grid place-items-center font-display font-bold text-2xl shadow-kori">
            {profile?.display_name?.[0]?.toUpperCase() ?? "K"}
          </div>
          <p className="font-display text-xl font-bold mt-3">{profile?.display_name}</p>
          <p className="text-sm text-muted-foreground">{profile?.phone_number}</p>
        </div>

        <Row label="Code parrainage" value={profile?.referral_code ?? "—"} />
        <Row label="Pays" value={profile?.country_code ?? "—"} />

        {isAdmin && (
          <Link to="/admin" className="block bg-foreground text-background rounded-2xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <p className="font-semibold">Administration</p>
              <p className="text-xs opacity-80">Gérer dépôts, retraits, utilisateurs</p>
            </div>
          </Link>
        )}

        <button onClick={logout} className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-destructive hover:bg-destructive/5">
          <LogOut className="w-5 h-5" /> <span className="font-semibold">Se déconnecter</span>
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
