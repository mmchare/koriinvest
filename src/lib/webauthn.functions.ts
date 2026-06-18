import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function rpInfo() {
  const origin = getRequestHeader("origin") ?? getRequestHeader("referer") ?? "";
  let url: URL;
  try { url = new URL(origin); } catch { url = new URL("https://localhost"); }
  return { rpID: url.hostname, origin: url.origin, rpName: "KORI" };
}

function phoneToEmail(country: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const cc = country.replace(/\D/g, "");
  return `u${cc}${digits}@kori.app`;
}

// ─── Registration (signed-in user enrolls a passkey) ─────────────────
export const webauthnRegisterStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, rpName } = rpInfo();

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("display_name, phone_number").eq("id", context.userId).single();
    const { data: existing } = await supabaseAdmin
      .from("webauthn_credentials").select("credential_id, transports").eq("user_id", context.userId);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(context.userId),
      userName: profile?.phone_number ?? "kori-user",
      userDisplayName: profile?.display_name ?? "KORI",
      attestationType: "none",
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
      })),
    });

    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      user_id: context.userId,
      kind: "register",
    });
    return options;
  });

const finishRegSchema = z.object({
  response: z.any(),
  device_name: z.string().max(60).optional(),
});
export const webauthnRegisterFinish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => finishRegSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = rpInfo();

    const challenge = data.response?.response?.clientDataJSON
      ? JSON.parse(Buffer.from(data.response.response.clientDataJSON, "base64").toString()).challenge
      : null;
    if (!challenge) throw new Error("Bad response");

    const { data: row } = await supabaseAdmin
      .from("webauthn_challenges").select("*")
      .eq("challenge", challenge).eq("user_id", context.userId).eq("kind", "register")
      .maybeSingle();
    if (!row) throw new Error("Challenge expired");

    const verification = await verifyRegistrationResponse({
      response: data.response,
      expectedChallenge: row.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) throw new Error("Verification failed");

    const { credential } = verification.registrationInfo;
    await supabaseAdmin.from("webauthn_credentials").insert({
      user_id: context.userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: credential.transports ?? null,
      device_name: data.device_name ?? "Cet appareil",
    });
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", row.id);
    return { ok: true };
  });

// ─── Authentication (passkey sign-in by phone) ──────────────────────
const loginStartSchema = z.object({ country: z.string().min(2).max(6), phone: z.string().min(4).max(20) });
export const webauthnLoginStart = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginStartSchema.parse(d))
  .handler(async ({ data }) => {
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID } = rpInfo();

    const email = phoneToEmail(data.country, data.phone);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users.find((u) => u.email === email);
    if (!user) throw new Error("Aucun compte trouvé");

    const { data: creds } = await supabaseAdmin
      .from("webauthn_credentials").select("credential_id, transports").eq("user_id", user.id);
    if (!creds || creds.length === 0) throw new Error("Biométrie non activée");

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
      })),
    });
    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge, user_id: user.id, kind: "authenticate", phone_lookup: email,
    });
    return options;
  });

const loginFinishSchema = z.object({ response: z.any() });
export const webauthnLoginFinish = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginFinishSchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = rpInfo();

    const clientChallenge = JSON.parse(
      Buffer.from(data.response.response.clientDataJSON, "base64").toString()
    ).challenge;
    const { data: row } = await supabaseAdmin
      .from("webauthn_challenges").select("*")
      .eq("challenge", clientChallenge).eq("kind", "authenticate").maybeSingle();
    if (!row || !row.user_id || !row.phone_lookup) throw new Error("Challenge expired");

    const { data: cred } = await supabaseAdmin
      .from("webauthn_credentials").select("*")
      .eq("credential_id", data.response.id).eq("user_id", row.user_id).maybeSingle();
    if (!cred) throw new Error("Credential not found");

    const verification = await verifyAuthenticationResponse({
      response: data.response,
      expectedChallenge: row.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, "base64")),
        counter: Number(cred.counter),
        transports: (cred.transports ?? undefined) as AuthenticatorTransport[] | undefined,
      },
    });
    if (!verification.verified) throw new Error("Échec biométrie");

    await supabaseAdmin.from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", cred.id);
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", row.id);

    // Issue magic link → client verifies it to create a session
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: row.phone_lookup,
    });
    if (error || !link.properties?.hashed_token) throw new Error("Token error");
    return { ok: true, token_hash: link.properties.hashed_token, email: row.phone_lookup };
  });

// ─── Management ─────────────────────────────────────────────────────
export const webauthnList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("id, device_name, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const removeSchema = z.object({ id: z.string().uuid() });
export const webauthnRemove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => removeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("webauthn_credentials").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
