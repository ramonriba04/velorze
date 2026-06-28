// Structured taxonomy used across profile and project forms.
// Keep DB-friendly slugs as values; labels are i18n keys.

export const SECTORS = [
  "technology","fintech","healthcare","real_estate","energy","industry","ai","saas",
  "biotech","education","consumer","crypto","gaming","mobility","climate",
] as const;
export type Sector = (typeof SECTORS)[number] | string;

export const INVESTMENT_TYPES = [
  "equity","debt","convertible","revenue_share","crowdfunding","angel","venture",
  "private_equity","strategic","joint_venture","prestamo","otro",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

// Subset shown in the picker (legacy values kept readable but de-emphasized).
export const INVESTMENT_TYPE_OPTIONS = [
  "equity","debt","convertible","revenue_share","crowdfunding","angel","venture",
  "private_equity","strategic",
] as const;

export const BUSINESS_STAGES = [
  "idea","mvp","early_revenue","growth","expansion","mature","crecimiento",
] as const;
export type BusinessStage = (typeof BUSINESS_STAGES)[number];

export const BUSINESS_STAGE_OPTIONS = [
  "idea","mvp","early_revenue","growth","expansion","mature",
] as const;

export const COMPANY_TYPES = [
  "startup","sme","corporate","holding","venture_studio","accelerator",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number] | string;

// Entity types — who is raising investment. Replaces the implicit "always a company" assumption.
export const ENTITY_TYPES = [
  "persona_fisica","startup","empresa","holding","otro",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RISK_LEVELS = ["bajo","medio","alto"] as const;

// Investment / capital ranges (in EUR/USD agnostic units).
export const INVESTMENT_RANGES = [
  { key: "0_10k",     min: 0,        max: 10_000 },
  { key: "10k_50k",   min: 10_000,   max: 50_000 },
  { key: "50k_100k",  min: 50_000,   max: 100_000 },
  { key: "100k_500k", min: 100_000,  max: 500_000 },
  { key: "500k_1m",   min: 500_000,  max: 1_000_000 },
  { key: "1m_plus",   min: 1_000_000, max: null as number | null },
] as const;

// Curated country list (ISO-ish names, English labels used as values).
export const COUNTRIES = [
  "España","Portugal","Francia","Reino Unido","Alemania","Italia","Países Bajos",
  "Bélgica","Suiza","Irlanda","Suecia","Noruega","Dinamarca","Finlandia","Polonia",
  "Austria","Grecia","Estados Unidos","Canadá","México","Brasil","Argentina","Chile",
  "Colombia","Perú","Uruguay","Ecuador","Costa Rica","Panamá","República Dominicana",
  "Marruecos","Sudáfrica","Emiratos Árabes Unidos","Arabia Saudí","Israel","Turquía",
  "India","China","Japón","Singapur","Corea del Sur","Australia","Nueva Zelanda",
] as const;

// Normalize free-text custom values so matching/dedup is consistent.
export function normalizeCustom(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 50);
}

export function dedupNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const n = normalizeCustom(v);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}
