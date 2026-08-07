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


async function blockedIds(ctx: { supabase: any; userId: string }): Promise<Set<string>> {
  const { data } = await ctx.supabase.rpc("blocked_with_me", { _user_id: ctx.userId });
  const ids = ((data as any[]) ?? [])
    .map((row: any) => (typeof row === "string" ? row : row?.blocked_with_me))
    .filter(Boolean);
  return new Set<string>(ids);
}

export const getRecommendedProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const blocked = await blockedIds(context);
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

    const visible = (projects ?? []).filter((p: any) => !blocked.has(p.company_id));

    if (!investor) {
      return {
        hasProfile: false,
        items: visible.map((p) => ({ project: p, match: { score: 0, reasons: [] } })),
      };
    }

    const scored = visible
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

    const blockedSet = await blockedIds(context);
    const { data: investors } = await context.supabase
      .from("investor_profiles")
      .select("*, profiles:user_id(full_name, avatar_url)")
      .limit(200);

    const scored = (investors ?? [])
      .filter((inv: any) => !blockedSet.has(inv.user_id))
      .map((inv) => ({
        investor: inv,
        match: computeMatch(project as Project, inv as unknown as InvestorProfile),
      }))
      .filter((i) => i.match.score >= 40)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 30);

    return { items: scored };
  });
