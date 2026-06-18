export const KRI_PER_XAF = 0.1; // 1 XAF = 0.1 KRI → 1 KRI = 10 XAF (fallback if config absent)

export function fmtXaf(n: number, currency = "XAF"): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " " + currency;
}
export function fmtKri(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " KRI";
}
export function xafToKri(xaf: number, rate = KRI_PER_XAF): number {
  return Math.round(xaf * rate * 10000) / 10000;
}
export function kriToXaf(kri: number, rate = KRI_PER_XAF): number {
  return Math.round(kri / rate);
}

export const COUNTRIES = [
  { code: "+237", flag: "🇨🇲", name: "Cameroun", currency: "XAF" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire", currency: "XOF" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal", currency: "XOF" },
  { code: "+229", flag: "🇧🇯", name: "Bénin", currency: "XOF" },
  { code: "+228", flag: "🇹🇬", name: "Togo", currency: "XOF" },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso", currency: "XOF" },
  { code: "+223", flag: "🇲🇱", name: "Mali", currency: "XOF" },
  { code: "+227", flag: "🇳🇪", name: "Niger", currency: "XOF" },
  { code: "+241", flag: "🇬🇦", name: "Gabon", currency: "XAF" },
  { code: "+242", flag: "🇨🇬", name: "Congo", currency: "XAF" },
  { code: "+236", flag: "🇨🇫", name: "RCA", currency: "XAF" },
  { code: "+235", flag: "🇹🇩", name: "Tchad", currency: "XAF" },
];

export function currencyFor(countryCode: string): string {
  return COUNTRIES.find((c) => c.code === countryCode)?.currency ?? "XAF";
}

export function phoneToEmail(country: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const cc = country.replace(/\D/g, "");
  return `u${cc}${digits}@kori.app`;
}
