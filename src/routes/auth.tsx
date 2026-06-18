import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, phoneToEmail } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { webauthnLoginStart, webauthnLoginFinish } from "@/lib/webauthn.functions";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).default("signup"), ref: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Connexion — KORI" },
      { name: "description", content: "Connecte-toi à ton portefeuille KORI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, ref } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [country, setCountry] = useState("+237");
  const [phone, setPhone] = useState("");
  const [phoneConfirm, setPhoneConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [refCode, setRefCode] = useState(ref ?? "");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const startBio = useServerFn(webauthnLoginStart);
  const finishBio = useServerFn(webauthnLoginFinish);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) return toast.error("Numéro invalide");
    if (isSignup) {
      const confirmDigits = phoneConfirm.replace(/\D/g, "");
      if (digits !== confirmDigits) return toast.error("Les deux numéros ne correspondent pas");
      if (displayName.trim().length < 2) return toast.error("Nom d'affichage requis");
    }
    if (password.length < 6) return toast.error("Mot de passe trop court (6+)");

    setLoading(true);
    try {
      const email = phoneToEmail(country, digits);
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone_number: country + digits,
              display_name: displayName.trim(),
              country_code: country,
              referral_code_used: refCode.trim().toUpperCase() || null,
            },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        toast.success("Bienvenue sur KORI 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error(m.includes("Invalid login") ? "Numéro ou mot de passe incorrect" : m);
    } finally {
      setLoading(false);
    }
  }

  async function biometricLogin() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) return toast.error("Saisis d'abord ton numéro");
    setBioLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const options = await startBio({ data: { country, phone: digits } });
      const assertion = await startAuthentication({ optionsJSON: options });
      const { token_hash, email } = await finishBio({ data: { response: assertion } });
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink", email });
      if (error) throw error;
      toast.success("Connecté ✨");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec biométrie");
    } finally {
      setBioLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <header className="px-5 pt-6 pb-2 flex items-center gap-3">
          <Link to="/" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-display text-xl font-bold">{isSignup ? "Créer un compte" : "Se connecter"}</h1>
        </header>

        <form onSubmit={onSubmit} className="flex-1 px-5 pt-4 pb-8 flex flex-col gap-4">
          {isSignup && (
            <Field label="Nom d'affichage">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40" placeholder="ex: Aïcha" />
            </Field>
          )}
          <Field label="Numéro de téléphone">
            <div className="flex gap-2">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-secondary rounded-xl px-3 py-3 outline-none focus:ring-2 ring-primary/40 max-w-[110px]">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40" placeholder="6 12 34 56 78" />
            </div>
          </Field>
          {isSignup && (
            <Field label="Confirmer le numéro">
              <input
                inputMode="tel"
                value={phoneConfirm}
                onChange={(e) => setPhoneConfirm(e.target.value)}
                onPaste={(e) => { e.preventDefault(); toast.error("Saisis ton numéro à nouveau, sans copier-coller"); }}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40"
                placeholder="Re-saisis le même numéro"
              />
              {phoneConfirm && phone.replace(/\D/g, "") !== phoneConfirm.replace(/\D/g, "") && (
                <span className="text-xs text-destructive mt-1">Les numéros ne correspondent pas</span>
              )}
            </Field>
          )}
          <Field label="Mot de passe">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40" placeholder="••••••••" />
          </Field>
          {isSignup && (
            <Field label="Code de parrainage (optionnel)">
              <input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/40 uppercase tracking-widest" placeholder="KORI1234" />
            </Field>
          )}

          <button type="submit" disabled={loading} className="mt-2 w-full bg-kori-gradient text-white font-semibold rounded-2xl py-4 shadow-kori disabled:opacity-60 active:scale-[0.98] transition">
            {loading ? "Patientez…" : isSignup ? "Créer mon compte" : "Se connecter"}
          </button>

          {!isSignup && (
            <button
              type="button"
              onClick={biometricLogin}
              disabled={bioLoading}
              className="w-full border border-border bg-card text-foreground font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60 active:scale-[0.98] transition"
            >
              <Fingerprint className="w-5 h-5 text-primary" />
              {bioLoading ? "Vérification…" : "Connexion biométrique"}
            </button>
          )}

          <div className="text-center text-sm text-muted-foreground mt-2">
            {isSignup ? (
              <>Déjà inscrit ? <Link to="/auth" search={{ mode: "signin" }} className="text-primary font-semibold">Se connecter</Link></>
            ) : (
              <>Pas de compte ? <Link to="/auth" search={{ mode: "signup" }} className="text-primary font-semibold">Créer un compte</Link></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
