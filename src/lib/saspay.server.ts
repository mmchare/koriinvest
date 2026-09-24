// Client HTTP SasPay (serveur uniquement) — https://docs.saspay.me
const BASE_URL = "https://api.saspay.me/api/v1";

// La clé SasPay peut être enregistrée sous SASPAY_SECRET_KEY ou STRIPE_LIVE_API_KEY.
function resolveKey(): string | undefined {
  return process.env.SASPAY_SECRET_KEY ?? process.env.STRIPE_LIVE_API_KEY;
}

export function saspayKey(): string {
  const key = resolveKey();
  if (!key) throw new Error("Paiements indisponibles : clé SasPay non configurée.");
  return key;
}

export function hasSaspayKey(): boolean {
  return Boolean(resolveKey());
}

type SasEnvelope<T> = { success?: boolean; data?: T; error?: unknown; message?: string; code?: unknown };

function errMessage(body: unknown, fallback: string): string {
  const b = body as SasEnvelope<unknown> | undefined;
  const e = b?.error as { message?: string } | Record<string, string[]> | undefined;
  if (e && typeof e === "object") {
    if (typeof (e as { message?: string }).message === "string") return (e as { message: string }).message;
    const first = Object.values(e as Record<string, string[]>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  if (typeof b?.message === "string") return b.message;
  return fallback;
}

async function call<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${saspayKey()}`,
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const resp = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const raw = (await resp.json().catch(() => null)) as SasEnvelope<T> | null;
  if (!resp.ok) throw new Error(errMessage(raw, `SasPay a refusé la requête (${resp.status}).`));
  // L'API renvoie soit une enveloppe { success, data }, soit l'objet directement.
  return (raw?.data ?? (raw as unknown)) as T;
}

export type SasPayin = {
  id?: string;
  reference?: string;
  status?: string;
  checkout_url?: string;
  instructions?: string;
  message?: string;
};

export async function initiateSoftpay(input: {
  amount: number;
  currency: string;
  country: string;
  network: string;
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<SasPayin> {
  return call<SasPayin>(
    "/payments/softpay/",
    {
      amount: input.amount.toFixed(2),
      currency: input.currency,
      country: input.country,
      network: input.network,
      description: input.description,
      customer: {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      },
      ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    input.idempotencyKey,
  );
}

export type SasPayout = { id?: string; reference?: string; status?: string; message?: string };

export async function initiatePayout(input: {
  amount: number;
  currency: string;
  country: string;
  method: string;
  msisdn: string;
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<SasPayout> {
  return call<SasPayout>(
    "/payouts/initialize/",
    {
      amount: input.amount.toFixed(2),
      currency: input.currency,
      country: input.country,
      method: input.method,
      description: input.description,
      customer: {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      },
      recipient: { msisdn: input.msisdn },
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    input.idempotencyKey,
  );
}
