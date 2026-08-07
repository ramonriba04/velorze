import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { blockedIds } from "./blocks.server";
import {
  computeMatch,
  type MatchableInvestor,
  type MatchableProject,
} from "./matching";

const DAILY_CAP = 20;

async function getRole(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle();
  return (data?.role as "inversor" | "empresa" | "admin" | null) ?? null;
}



export const getDiscoveryFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getRole(context);
    const blocked = await blockedIds(context);
    const { data: usedToday } = await context.supabase.rpc(
      "discovery_today_interest_count",
      { _user_id: context.userId },
    );
    const remaining = Math.max(0, DAILY_CAP - (usedToday ?? 0));

    // Skip already-decided targets
    const { data: decided } = await context.supabase
      .from("discovery_interactions")
      .select("target_user_id, project_id")
      .eq("user_id", context.userId);
    const decidedKeys = new Set(
      (decided ?? []).map((d: any) => `${d.target_user_id}:${d.project_id ?? ""}`),
    );

    if (role === "empresa") {
      // Company discovers investors
      const { data: investors } = await context.supabase
        .from("investor_profiles")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .neq("user_id", context.userId)
        .limit(80);

      // pick one of company's own projects as scoring basis
      const { data: ownProjects } = await context.supabase
        .from("projects")
        .select("*")
        .eq("company_id", context.userId)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1);
      const baseProject = (ownProjects ?? [])[0] ?? null;

      const items = (investors ?? [])
        .filter((inv: any) => !decidedKeys.has(`${inv.user_id}:`) && !blocked.has(inv.user_id))
        .map((inv: any) => {
          const match = baseProject
            ? computeMatch(baseProject as MatchableProject, inv as MatchableInvestor)
            : { score: 50, reasons: [], chips: [] };
          return { kind: "investor" as const, investor: inv, match };
        })
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 30);

      return { role, items, remaining, used: usedToday ?? 0, cap: DAILY_CAP };
    }

    // investor (default) discovers projects
    const { data: investor } = await context.supabase
      .from("investor_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: projects } = await context.supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .neq("company_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(80);

    const items = (projects ?? [])
      .filter((p: any) => !decidedKeys.has(`${p.company_id}:${p.id}`) && !blocked.has(p.company_id))
      .map((p: any) => {
        const match = investor
          ? computeMatch(p as MatchableProject, investor as MatchableInvestor)
          : { score: 0, reasons: [], chips: [] };
        return { kind: "project" as const, project: p, match };
      })
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 30);

    return { role, items, remaining, used: usedToday ?? 0, cap: DAILY_CAP };
  });

export const recordDiscoveryDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        target_user_id: z.string().uuid(),
        project_id: z.string().uuid().nullable().optional(),
        decision: z.enum(["interested", "skipped"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.target_user_id === context.userId) {
      throw new Error("cannot_decide_self");
    }

    if (data.decision === "interested") {
      const { data: usedToday } = await context.supabase.rpc(
        "discovery_today_interest_count",
        { _user_id: context.userId },
      );
      if ((usedToday ?? 0) >= DAILY_CAP) {
        throw new Error("daily_cap_reached");
      }
    }

    const { error: upErr } = await context.supabase
      .from("discovery_interactions")
      .upsert(
        {
          user_id: context.userId,
          target_user_id: data.target_user_id,
          project_id: data.project_id ?? null,
          decision: data.decision,
        },
        { onConflict: "user_id,target_user_id,project_id" },
      );
    if (upErr) throw new Error(upErr.message);

    if (data.decision !== "interested") {
      return { ok: true, matched: false };
    }

    // Determine my role to set up the pair (investor_id / company_id)
    const role = await getRole(context);
    const investorId = role === "empresa" ? data.target_user_id : context.userId;
    const companyId = role === "empresa" ? context.userId : data.target_user_id;

    // Does the other party also have an interested row aimed at me?
    const { data: reciprocal } = await context.supabase
      .from("discovery_interactions")
      .select("id, project_id")
      .eq("user_id", data.target_user_id)
      .eq("target_user_id", context.userId)
      .eq("decision", "interested")
      .limit(1);

    const matched = (reciprocal ?? []).length > 0;
    if (!matched) {
      // Create or refresh a pending connection
      await context.supabase.from("connections").upsert(
        {
          investor_id: investorId,
          company_id: companyId,
          project_id: data.project_id ?? reciprocal?.[0]?.project_id ?? null,
          status: "pendiente",
        },
        { onConflict: "investor_id,company_id" },
      );
      return { ok: true, matched: false };
    }

    // Mutual interest — promote to conectado + create accepted contact_request
    const projectId =
      data.project_id ?? reciprocal?.[0]?.project_id ?? null;

    await context.supabase.from("connections").upsert(
      {
        investor_id: investorId,
        company_id: companyId,
        project_id: projectId,
        status: "conectado",
      },
      { onConflict: "investor_id,company_id" },
    );

    if (projectId) {
      // Upsert an accepted contact_request -> trigger creates conversation
      await context.supabase.from("contact_requests").upsert(
        {
          investor_id: investorId,
          company_id: companyId,
          project_id: projectId,
          status: "accepted",
          message: "__discovery_match__",
        },
        { onConflict: "investor_id,project_id" },
      );
    }

    return { ok: true, matched: true };
  });

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("connections")
      .select("*")
      .or(`investor_id.eq.${context.userId},company_id.eq.${context.userId}`)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set(
        (data ?? []).flatMap((c: any) => [c.investor_id, c.company_id]),
      ),
    ).filter((id) => id !== context.userId);

    const [companies, investors, profiles] = await Promise.all([
      context.supabase
        .from("company_profiles")
        .select("user_id, legal_name, logo_url, entity_type")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      context.supabase
        .from("investor_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      context.supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const cMap: Record<string, any> = {};
    (companies.data ?? []).forEach((c: any) => (cMap[c.user_id] = c));
    const iMap: Record<string, any> = {};
    (investors.data ?? []).forEach((i: any) => (iMap[i.user_id] = i));
    const pMap: Record<string, any> = {};
    (profiles.data ?? []).forEach((p: any) => (pMap[p.id] = p));

    return {
      items: (data ?? []).map((c: any) => ({
        ...c,
        company: cMap[c.company_id] ?? null,
        investor: iMap[c.investor_id] ?? null,
        otherProfile:
          pMap[c.investor_id === context.userId ? c.company_id : c.investor_id] ??
          null,
        me_role: c.investor_id === context.userId ? "investor" : "company",
      })),
    };
  });

export const updateConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendiente", "conectado", "descartado"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("connections")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
