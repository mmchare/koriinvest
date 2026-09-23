// Catalogue SasPay : pays supportés (indicatif -> ISO2) et réseaux Mobile Money.
// Client-safe (aucun secret) — utilisé par l'UI de dépôt/retrait.

export type SasNetwork = { code: string; label: string };

export const SASPAY_COUNTRIES: Record<string, { iso: string; currency: string; networks: SasNetwork[] }> = {
  "+237": {
    iso: "CM", currency: "XAF",
    networks: [
      { code: "mtn_cm", label: "MTN MoMo" },
      { code: "orange_cm", label: "Orange Money" },
    ],
  },
  "+225": {
    iso: "CI", currency: "XOF",
    networks: [
      { code: "wave_ci", label: "Wave" },
      { code: "orange_ci", label: "Orange Money" },
      { code: "mtn_ci", label: "MTN MoMo" },
      { code: "moov_ci", label: "Moov Money" },
    ],
  },
  "+221": {
    iso: "SN", currency: "XOF",
    networks: [
      { code: "wave_sn", label: "Wave" },
      { code: "orange_sn", label: "Orange Money" },
      { code: "freemoney_sn", label: "Free Money" },
      { code: "wizall_sn", label: "Wizall" },
    ],
  },
  "+229": {
    iso: "BJ", currency: "XOF",
    networks: [
      { code: "mtn_bj", label: "MTN MoMo" },
      { code: "moov_bj", label: "Moov Money" },
      { code: "celtiis_bj", label: "Celtiis Cash" },
    ],
  },
  "+228": {
    iso: "TG", currency: "XOF",
    networks: [
      { code: "moov_tg", label: "Moov Money" },
      { code: "togocel", label: "Togocel Money" },
    ],
  },
  "+226": {
    iso: "BF", currency: "XOF",
    networks: [
      { code: "orange_bf", label: "Orange Money" },
      { code: "moov_bf", label: "Moov Money" },
    ],
  },
  "+223": {
    iso: "ML", currency: "XOF",
    networks: [
      { code: "orange_ml", label: "Orange Money" },
      { code: "moov_ml", label: "Moov Money" },
      { code: "mobi_cash_ml", label: "Mobi Cash" },
    ],
  },
  "+227": {
    iso: "NE", currency: "XOF",
    networks: [{ code: "airtel_ne", label: "Airtel Money" }],
  },
  "+224": {
    iso: "GN", currency: "GNF",
    networks: [{ code: "mtn_gn", label: "MTN MoMo" }],
  },
};

export function networksFor(countryCode: string): SasNetwork[] {
  return SASPAY_COUNTRIES[countryCode]?.networks ?? SASPAY_COUNTRIES["+237"]!.networks;
}

export function isoFor(countryCode: string): string {
  return SASPAY_COUNTRIES[countryCode]?.iso ?? "CM";
}

export function isSupportedCountry(countryCode: string): boolean {
  return Boolean(SASPAY_COUNTRIES[countryCode]);
}

export const ALL_NETWORK_CODES: string[] = Object.values(SASPAY_COUNTRIES).flatMap((c) =>
  c.networks.map((n) => n.code),
);
