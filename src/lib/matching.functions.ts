import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MatchBreakdown = {
  score: number;
  reasons: string[];
};

type Project = {
  sector: string;
  investment_type: string;
  ticket_min: number | null;
  ticket_max: number | null;
  capital_required: number;
  country: string;
  stage: string;
};

type InvestorProfile = {
  sectors: string[];
  investment_types: string[];
  ticket_min: number | null;
  ticket_max: number | null;
  countries: string[];
  risk_level: "bajo" | "medio" | "alto";
};

const stageToRisk: Record<string, "bajo" | "medio" | "alto"> = {
  idea: "alto",
  crecimiento: "medio",
  expansion: "bajo",
};

export function computeMatch(project: Project, investor: InvestorProfile): MatchBreakdown {
  let score = 0;
  const reasons: string[] = [];

  // Sector 30
  const sectors = (investor.sectors ?? []).map((s) => s.toLowerCase().trim());
  if (sectors.length === 0) {
    score += 15; // neutral
  } else if (sectors.includes(project.sector.toLowerCase().trim())) {
    score += 30;
    reasons.push(`Sector ${project.sector}`);
  }

  // Ticket overlap 25
  const pMin = project.ticket_min ?? 0;
  const pMax = project.ticket_max ?? project.capital_required;
  const iMin = investor.ticket_min ?? 0;
  const iMax = investor.ticket_max ?? Number.MAX_SAFE_INTEGER;
  const overlap = Math.min(pMax, iMax) - Math.max(pMin, iMin);
  if (overlap >= 0) {
    score += 25;
    reasons.push("Ticket compatible");
  } else if (!investor.ticket_min && !investor.ticket_max) {
    score += 12;
  }

  // Country 15
  const countries = (investor.countries ?? []).map((c) => c.toLowerCase().trim());
  if (countries.length === 0) {
    score += 7;
  } else if (countries.includes(project.country.toLowerCase().trim())) {
    score += 15;
    reasons.push(`País ${project.country}`);
  }

  // Investment type 15
  if (!investor.investment_types || investor.investment_types.length === 0) {
    score += 7;
  } else if (investor.investment_types.includes(project.investment_type)) {
    score += 15;
    reasons.push(`Tipo ${project.investment_type}`);
  }

  // Risk alignment 10
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

  // Small uniform bonus for completeness
  score += 5;

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export const getRecommendedProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: investor } = await context.supabase
      .from("investor_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: projects, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);

    if (!investor) {
      return {
        hasProfile: false,
        items: (projects ?? []).map((p) => ({ project: p, match: { score: 0, reasons: [] } })),
      };
    }

    const scored = (projects ?? [])
      .map((p) => ({ project: p, match: computeMatch(p as Project, investor as InvestorProfile) }))
      .sort((a, b) => b.match.score - a.match.score);

    return { hasProfile: true, items: scored };
  });

export const getProjectMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    const { data: investor } = await context.supabase
      .from("investor_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!investor) return { score: 0, reasons: [], hasProfile: false };
    const match = computeMatch(project as Project, investor as InvestorProfile);
    return { ...match, hasProfile: true };
  });

export const getCompatibleInvestors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.project_id)
      .eq("company_id", context.userId)
      .maybeSingle();
    if (!project) throw new Error("Project not found or not yours");

    const { data: investors } = await context.supabase
      .from("investor_profiles")
      .select("*, profiles:user_id(full_name, avatar_url)")
      .limit(200);

    const scored = (investors ?? [])
      .map((inv) => ({
        investor: inv,
        match: computeMatch(project as Project, inv as unknown as InvestorProfile),
      }))
      .filter((i) => i.match.score >= 40)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 30);

    return { items: scored };
  });
