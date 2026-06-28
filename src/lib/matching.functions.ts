import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  computeMatch as computeMatchPure,
  type MatchableInvestor as InvestorProfile,
  type MatchableProject as Project,
} from "./matching";

export type MatchBreakdown = {
  score: number;
  reasons: string[];
};

export function computeMatch(project: Project, investor: InvestorProfile): MatchBreakdown {
  const { score, reasons } = computeMatchPure(project, investor);
  return { score, reasons };
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
