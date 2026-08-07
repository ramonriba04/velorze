import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Block                                                                      */
/* -------------------------------------------------------------------------- */

const UserIdInput = z.object({ user_id: z.string().uuid() });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("cannot_block_self");
    const { error } = await context.supabase
      .from("blocked_users")
      .upsert(
        { blocker_id: context.userId, blocked_id: data.user_id },
        { onConflict: "blocker_id,blocked_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("blocked_users")
      .select("blocked_id, created_at")
      .eq("blocker_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.blocked_id);
    if (ids.length === 0) return [];
    const [{ data: companies }, { data: investors }, { data: profiles }] = await Promise.all([
      context.supabase.from("company_profiles").select("user_id, legal_name, logo_url, entity_type").in("user_id", ids),
      context.supabase.from("investor_profiles").select("user_id, display_name, avatar_url").in("user_id", ids),
      context.supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
    ]);
    const cm = new Map((companies ?? []).map((c: any) => [c.user_id, c]));
    const im = new Map((investors ?? []).map((i: any) => [i.user_id, i]));
    const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r) => {
      const c = cm.get(r.blocked_id) as any;
      const i = im.get(r.blocked_id) as any;
      const p = pm.get(r.blocked_id) as any;
      return {
        blocked_id: r.blocked_id,
        created_at: r.created_at,
        name: c?.legal_name ?? i?.display_name ?? p?.full_name ?? r.blocked_id.slice(0, 8),
        avatar_url: c?.logo_url ?? i?.avatar_url ?? p?.avatar_url ?? null,
        kind: c ? "company" : "user",
        entity_type: c?.entity_type ?? null,
      };
    });
  });

/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

const USER_REASONS = [
  "fraud",
  "payment_request",
  "impersonation",
  "spam",
  "inappropriate",
  "false_info",
  "other",
] as const;
const PROJECT_REASONS = ["false_info", "misleading", "spam", "inappropriate", "other"] as const;

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        reason: z.enum(USER_REASONS),
        details: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("cannot_report_self");
    const { error } = await context.supabase.from("user_reports").insert({
      reporter_id: context.userId,
      reported_user_id: data.user_id,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reportProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        reason: z.enum(PROJECT_REASONS),
        details: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_reports").insert({
      reporter_id: context.userId,
      project_id: data.project_id,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------------------- */
/*  Admin: moderation queue                                                    */
/* -------------------------------------------------------------------------- */

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const StatusFilter = z.enum(["pending", "reviewed", "resolved", "dismissed", "all"]).default("pending");

export const adminListUserReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ status: StatusFilter }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("user_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).flatMap((r: any) => [r.reporter_id, r.reported_user_id])));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, suspended_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Aggregate history per reported user (all statuses) to help admins prioritise
    const reportedIds = Array.from(new Set((rows ?? []).map((r: any) => r.reported_user_id)));
    const { data: allForUsers } = await supabaseAdmin
      .from("user_reports")
      .select("reported_user_id, reason, created_at")
      .in("reported_user_id", reportedIds.length ? reportedIds : ["00000000-0000-0000-0000-000000000000"]);
    const summary = new Map<string, { total: number; last_at: string | null; top_reason: string | null }>();
    const reasonCounts = new Map<string, Map<string, number>>();
    (allForUsers ?? []).forEach((r: any) => {
      const cur = summary.get(r.reported_user_id) ?? { total: 0, last_at: null, top_reason: null };
      cur.total += 1;
      if (!cur.last_at || new Date(r.created_at) > new Date(cur.last_at)) cur.last_at = r.created_at;
      summary.set(r.reported_user_id, cur);
      const rc = reasonCounts.get(r.reported_user_id) ?? new Map<string, number>();
      rc.set(r.reason, (rc.get(r.reason) ?? 0) + 1);
      reasonCounts.set(r.reported_user_id, rc);
    });
    reasonCounts.forEach((rc, uid) => {
      const top = Array.from(rc.entries()).sort((a, b) => b[1] - a[1])[0];
      const cur = summary.get(uid);
      if (cur && top) cur.top_reason = top[0];
    });

    return (rows ?? []).map((r: any) => ({
      ...r,
      reporter_name: pm.get(r.reporter_id)?.full_name ?? null,
      reported_name: pm.get(r.reported_user_id)?.full_name ?? null,
      reported_suspended: !!pm.get(r.reported_user_id)?.suspended_at,
      summary: summary.get(r.reported_user_id) ?? { total: 1, last_at: r.created_at, top_reason: r.reason },
    }));
  });

export const adminListProjectReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ status: StatusFilter }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("project_reports")
      .select("*, projects(id, title, hidden_by_moderation, company_id, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const ActionInput = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "hide_project",
    "restore_project",
    "suspend_user",
    "restore_user",
    "mark_reviewed",
    "resolve",
    "dismiss",
  ]),
  notes: z.string().trim().max(500).optional().nullable(),
  target_type: z.enum(["user_report", "project_report"]),
});

export const adminModerationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActionInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = data.target_type === "user_report" ? "user_reports" : "project_reports";
    const { data: report, error: rErr } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!report) throw new Error("Report not found");

    // Apply structural action
    if (data.action === "hide_project" && data.target_type === "project_report") {
      await supabaseAdmin
        .from("projects")
        .update({ hidden_by_moderation: true, status: "draft" })
        .eq("id", (report as any).project_id);
    }
    if (data.action === "restore_project" && data.target_type === "project_report") {
      await supabaseAdmin
        .from("projects")
        .update({ hidden_by_moderation: false })
        .eq("id", (report as any).project_id);
    }
    if (data.action === "suspend_user" && data.target_type === "user_report") {
      await supabaseAdmin
        .from("profiles")
        .update({ suspended_at: new Date().toISOString() })
        .eq("id", (report as any).reported_user_id);
    }
    if (data.action === "restore_user" && data.target_type === "user_report") {
      await supabaseAdmin
        .from("profiles")
        .update({ suspended_at: null })
        .eq("id", (report as any).reported_user_id);
    }

    // Report status transition
    let nextStatus: string | null = null;
    if (data.action === "mark_reviewed") nextStatus = "reviewed";
    if (data.action === "resolve") nextStatus = "resolved";
    if (data.action === "dismiss") nextStatus = "dismissed";
    if (["hide_project", "suspend_user"].includes(data.action)) nextStatus = "resolved";

    if (nextStatus) {
      await supabaseAdmin
        .from(table)
        .update({
          status: nextStatus,
          admin_notes: data.notes ?? (report as any).admin_notes ?? null,
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
    }

    await supabaseAdmin.from("moderation_audit").insert({
      actor_id: context.userId,
      target_type: data.target_type,
      target_id: data.id,
      action: data.action,
      notes: data.notes ?? null,
    });

    return { ok: true };
  });

export const getUserSafetyFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: block } = await context.supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.user_id)
      .maybeSingle();
    return { blocked: !!block };
  });

/* -------------------------------------------------------------------------- */
/*  Shared helper: users involved in a block with me (either direction)        */
/* -------------------------------------------------------------------------- */

export const listBlockedWithMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("blocked_with_me", { _user_id: context.userId });
    return ((data as any[]) ?? []).map((row: any) =>
      typeof row === "string" ? row : row?.blocked_with_me,
    ).filter(Boolean) as string[];
  });
