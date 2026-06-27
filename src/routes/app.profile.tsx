import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Shield, Fingerprint, Trash2, Bell, BellOff } from "lucide-react";
import { useProfile, useIsAdmin } from "@/hooks/use-kori";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { webauthnList, webauthnRegisterStart, webauthnRegisterFinish, webauthnRemove } from "@/lib/webauthn.functions";
import { savePushSubscription, removePushSubscription } from "@/lib/push.functions";
import { pushSupported, subscribePush, unsubscribePush, getPushSubscription } from "@/lib/push-client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listFn = useServerFn(webauthnList);
  const startFn = useServerFn(webauthnRegisterStart);
  const finishFn = useServerFn(webauthnRegisterFinish);
  const removeFn = useServerFn(webauthnRemove);

  const { data: passkeys } = useQuery({ queryKey: ["passkeys"], queryFn: () => listFn() });
  const [enrolling, setEnrolling] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const saveSubFn = useServerFn(savePushSubscription);
  const rmSubFn = useServerFn(removePushSubscription);

  useEffect(() => {
    if (!pushSupported()) return;
    getPushSubscription().then((s) => setPushOn(!!s));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (!pushSupported()) { toast.error("Notifications non supportées"); return; }
      if (pushOn) {
        const sub = await getPushSubscription();
        if (sub) {
          await unsubscribePush();
          await rmSubFn({ data: { endpoint: sub.endpoint } });
        }
        setPushOn(false);
        toast.success("Notifications désactivées");
      } else {
        const sub = await subscribePush();
        await saveSubFn({ data: { ...sub, user_agent: navigator.userAgent.slice(0, 480) } });
        setPushOn(true);
        toast.success("Notifications activées 🔔");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    } finally {
      setPushBusy(false);
    }
  }


  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" } });
  }

  async function enroll() {
    setEnrolling(true);
    try {
      const { startRegistration, browserSupportsWebAuthn } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) {
        toast.error("Cet appareil ne supporte pas la biométrie");
        return;
      }
      const inIframe = window.self !== window.top;
      if (inIframe) {
        toast.error("Ouvre l'app dans un onglet séparé pour activer la biométrie (la preview bloque WebAuthn).", { duration: 6000 });
        return;
      }
      const options = await startFn();
      const attestation = await startRegistration({ optionsJSON: options });
      const deviceName = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone/iPad"
        : /Android/.test(navigator.userAgent) ? "Android"
        : /Mac/.test(navigator.userAgent) ? "Mac"
        : "Cet appareil";
      await finishFn({ data: { response: attestation, device_name: deviceName } });
      toast.success("Biométrie activée 🔐");
      qc.invalidateQueries({ queryKey: ["passkeys"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    } finally {
      setEnrolling(false);
    }
  }

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["passkeys"] }); },
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Mon profil</h1>
      </header>

      <section className="px-5 space-y-4 pb-6">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-kori-gradient text-white grid place-items-center font-display font-bold text-2xl shadow-kori">
            {profile?.display_name?.[0]?.toUpperCase() ?? "K"}
          </div>
          <p className="font-display text-xl font-bold mt-3">{profile?.display_name}</p>
          <p className="text-sm text-muted-foreground">{profile?.phone_number}</p>
        </div>

        <Row label="Code parrainage" value={profile?.referral_code ?? "—"} />
        <Row label="Pays" value={profile?.country_code ?? "—"} />

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Connexion biométrique</p>
              <p className="text-xs text-muted-foreground">Face ID / empreinte sur cet appareil</p>
            </div>
          </div>
          {passkeys && passkeys.length > 0 && (
            <ul className="space-y-2">
              {passkeys.map((k) => (
                <li key={k.id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{k.device_name ?? "Appareil"}</p>
                    <p className="text-xs text-muted-foreground">
                      Ajouté le {new Date(k.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button onClick={() => removeMut.mutate(k.id)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-lg" aria-label="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={enroll}
            disabled={enrolling}
            className="w-full bg-kori-gradient text-white font-semibold rounded-xl py-3 disabled:opacity-60 active:scale-[0.98] transition"
          >
            {enrolling ? "Activation…" : "Activer sur cet appareil"}
          </button>
        </div>

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
