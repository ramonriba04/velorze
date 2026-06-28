// Pure, client-safe matching helpers. Mirrors the server logic so the Explore
// page can sort by compatibility without an extra round-trip.

export type MatchBreakdown = {
  score: number;
  reasons: string[];
  chips: { key: "sector" | "country" | "ticket" | "type" | "risk"; label: string }[];
};

export type MatchableProject = {
  sector: string;
  investment_type: string;
  ticket_min: number | null;
  ticket_max: number | null;
  capital_required: number;
  country: string;
  stage: string;
};

export type MatchableInvestor = {
  sectors: string[] | null;
  investment_types: string[] | null;
  ticket_min: number | null;
  ticket_max: number | null;
  countries: string[] | null;
  risk_level: "bajo" | "medio" | "alto";
};

const stageToRisk: Record<string, "bajo" | "medio" | "alto"> = {
  idea: "alto",
  crecimiento: "medio",
  expansion: "bajo",
};

export function computeMatch(
  project: MatchableProject,
  investor: MatchableInvestor,
): MatchBreakdown {
  let score = 0;
  const reasons: string[] = [];
  const chips: MatchBreakdown["chips"] = [];

  const sectors = (investor.sectors ?? []).map((s) => s.toLowerCase().trim());
  if (sectors.length === 0) {
    score += 15;
  } else if (sectors.includes(project.sector.toLowerCase().trim())) {
    score += 30;
    reasons.push(`Sector ${project.sector}`);
    chips.push({ key: "sector", label: project.sector });
  }

  const pMin = project.ticket_min ?? 0;
  const pMax = project.ticket_max ?? project.capital_required;
  const iMin = investor.ticket_min ?? 0;
  const iMax = investor.ticket_max ?? Number.MAX_SAFE_INTEGER;
  const overlap = Math.min(pMax, iMax) - Math.max(pMin, iMin);
  if (overlap >= 0) {
    score += 25;
    reasons.push("Ticket compatible");
    chips.push({ key: "ticket", label: formatTicketRange(pMin, pMax) });
  } else if (!investor.ticket_min && !investor.ticket_max) {
    score += 12;
  }

  const countries = (investor.countries ?? []).map((c) => c.toLowerCase().trim());
  if (countries.length === 0) {
    score += 7;
  } else if (countries.includes(project.country.toLowerCase().trim())) {
    score += 15;
    reasons.push(`País ${project.country}`);
    chips.push({ key: "country", label: project.country });
  }

  if (!investor.investment_types || investor.investment_types.length === 0) {
    score += 7;
  } else if (investor.investment_types.includes(project.investment_type)) {
    score += 15;
    reasons.push(`Tipo ${project.investment_type}`);
    chips.push({ key: "type", label: project.investment_type });
  }

  const projectRisk = stageToRisk[project.stage] ?? "medio";
  if (projectRisk === investor.risk_level) {
    score += 10;
    reasons.push(`Riesgo ${projectRisk}`);
  } else if (
    (projectRisk === "medio" && investor.risk_level !== "medio") ||
    (projectRisk !== "medio" && investor.risk_level === "medio")
  ) {
    score += 5;
  }

  score += 5;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    chips,
  };
}

function formatTicketRange(min: number, max: number) {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  };
  if (!max || max === Number.MAX_SAFE_INTEGER) return `${fmt(min)}+`;
  return `${fmt(min)}–${fmt(max)}`;
}
