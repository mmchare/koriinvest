import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { Home, Gift, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    return { userId: data.user.id };
  },
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/app", icon: Home, label: "Accueil", exact: true },
    { to: "/app/vault", icon: Lock, label: "Coffre" },
    { to: "/app/wheel", icon: Gift, label: "Roue" },
    { to: "/app/profile", icon: User, label: "Profil" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen pb-24 flex flex-col">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-md px-4 safe-bottom pointer-events-auto">
          <div className="bg-card/95 backdrop-blur border border-border rounded-2xl shadow-card flex justify-around py-2">
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <t.icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
