// Client-side mirror of the DB completeness rules so we can show progress and
// list missing fields without an extra round-trip.

export type MissingField = { key: string; label: string };

export type CompanyProfileShape = {
  legal_name?: string | null;
  country?: string | null;
  description?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  website?: string | null;
  entity_type?: string | null;
};

export type InvestorProfileShape = {
  display_name?: string | null;
  sectors?: string[] | null;
  ticket_min?: number | null;
  ticket_max?: number | null;
  countries?: string[] | null;
  investment_types?: string[] | null;
  description?: string | null;
};

const isEmail = (v?: string | null) =>
  !!v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
const hasText = (v: string | null | undefined, min: number) =>
  !!v && v.trim().length >= min;

// Mirror DB: individuals don't need logo/website; entities still do (logo required).
export function companyCompleteness(p: CompanyProfileShape) {
  const isIndividual = p.entity_type === "persona_fisica";
  const checks = [
    { key: "legal_name",    required: true,           ok: hasText(p.legal_name, 2) },
    { key: "country",       required: true,           ok: hasText(p.country, 2) },
    { key: "description",   required: true,           ok: hasText(p.description, 20) },
    { key: "contact_email", required: true,           ok: isEmail(p.contact_email) },
    { key: "logo_url",      required: true,           ok: !!p.logo_url }, // profile image for individuals
    { key: "website",       required: !isIndividual,  ok: !!p.website },
  ];
  const total = isIndividual ? 5 : 6;
  const done = checks.filter((c) => c.ok && (c.required || !isIndividual)).length;
  const pct = Math.round((done / total) * 100);
  const missingRequired = checks.filter((c) => c.required && !c.ok).map((c) => c.key);
  const complete = missingRequired.length === 0;
  return { pct, complete, missingRequired, checks, isIndividual };
}

export function investorCompleteness(p: InvestorProfileShape) {
  const ticketOk =
    p.ticket_min != null && p.ticket_max != null && p.ticket_max >= p.ticket_min;
  const checks = [
    { key: "display_name",     required: true,  ok: hasText(p.display_name, 2) },
    { key: "sectors",          required: true,  ok: (p.sectors?.length ?? 0) > 0 },
    { key: "investment_range", required: true,  ok: !!ticketOk },
    { key: "countries",        required: false, ok: (p.countries?.length ?? 0) > 0 },
    { key: "investment_types", required: false, ok: (p.investment_types?.length ?? 0) > 0 },
    { key: "description",      required: false, ok: hasText(p.description, 20) },
  ];
  const total = checks.length;
  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / total) * 100);
  const missingRequired = checks.filter((c) => c.required && !c.ok).map((c) => c.key);
  const complete = missingRequired.length === 0;
  return { pct, complete, missingRequired, checks };
}
