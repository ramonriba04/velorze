import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";


const RoleSchema = z.object({ role: z.enum(["empresa", "inversor"]) });

export const assignMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assign_my_role", { _role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const INVESTMENT_TYPES = [
  "equity","debt","convertible","revenue_share","crowdfunding","angel","venture",
  "private_equity","strategic","joint_venture","prestamo","otro",
] as const;

// Shared primitives — trim spaces, enforce sane lengths, prevent repeated separators.
const trimmed = (min: number, max: number) =>
  z.string().transform((s) => s.trim().replace(/\s{2,}/g, " ")).pipe(z.string().min(min).max(max));
const optionalTrimmed = (max: number) =>
  z.string().transform((s) => s.trim()).pipe(z.string().max(max)).optional().nullable().or(z.literal(""));
const customTag = z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(50));
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().email().max(254));

const InvestorProfileSchema = z.object({
  kind: z.enum(["personal", "corporativo"]),
  display_name: trimmed(2, 80).optional().nullable(),
  sectors: z.array(customTag).max(30),
  ticket_min: z.number().nonnegative().optional().nullable(),
  ticket_max: z.number().nonnegative().optional().nullable(),
  countries: z.array(customTag).max(40),
  investment_types: z.array(z.enum(INVESTMENT_TYPES)).max(15),
  risk_level: z.enum(["bajo", "medio", "alto"]),
  description: z.string().transform((s) => s.trim()).pipe(z.string().min(20).max(1000)).optional().nullable().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")).nullable(),
}).refine(
  (d) => d.ticket_min == null || d.ticket_max == null || d.ticket_max >= d.ticket_min,
  { message: "ticket_max must be >= ticket_min", path: ["ticket_max"] },
);

export const upsertInvestorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InvestorProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { error } = await context.supabase.from("investor_profiles").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const CompanyProfileSchema = z.object({
  entity_type: z.enum(["persona_fisica","startup","empresa","holding","otro"]),
  legal_name: trimmed(2, 80),
  website: z.string().url().max(200).optional().or(z.literal("")).nullable(),
  country: optionalTrimmed(80),
  company_type: optionalTrimmed(50),
  contact_email: emailField.optional().or(z.literal("")).nullable(),
  description: z.string().transform((s) => s.trim()).pipe(z.string().min(20).max(1000)).optional().nullable().or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")).nullable(),
});

export const upsertCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompanyProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { error } = await context.supabase.from("company_profiles").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Read completeness — used by UI to show progress and gate actions.
export const getMyCompleteness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: company }, { data: investor }] = await Promise.all([
      context.supabase.rpc("company_profile_completeness", { _user_id: context.userId }),
      context.supabase.rpc("investor_profile_completeness", { _user_id: context.userId }),
    ]);
    const [{ data: companyComplete }, { data: investorComplete }] = await Promise.all([
      context.supabase.rpc("company_profile_complete", { _user_id: context.userId }),
      context.supabase.rpc("investor_profile_complete", { _user_id: context.userId }),
    ]);
    return {
      companyPct: (company as number | null) ?? 0,
      investorPct: (investor as number | null) ?? 0,
      companyComplete: !!companyComplete,
      investorComplete: !!investorComplete,
    };
  });

// ---------------- Trust & Verification ----------------

const ConsentSchema = z.object({
  terms_version: z.string().min(1).max(20),
  privacy_version: z.string().min(1).max(20),
  cookies_version: z.string().min(1).max(20),
  user_agent: z.string().max(500).optional().nullable(),
});

export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConsentSchema.parse(input))
  .handler(async ({ data, context }) => {
    let ip: string | null = null;
    try {
      const req = getRequest();
      ip =
        req?.headers.get("cf-connecting-ip") ||
        req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req?.headers.get("x-real-ip") ||
        null;
    } catch {
      // request not available
    }
    const { error } = await context.supabase.from("user_consents" as never).insert({
      user_id: context.userId,
      terms_version: data.terms_version,
      privacy_version: data.privacy_version,
      cookies_version: data.cookies_version,
      ip,
      user_agent: data.user_agent ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const VerificationSchema = z.object({
  kind: z.enum(["company", "individual"]),
  legal_name: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80),
  doc_path: z.string().trim().min(1).max(500),
});

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerificationSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Insert request
    const { error: insErr } = await context.supabase.from("verification_requests" as never).insert({
      user_id: context.userId,
      kind: data.kind,
      legal_name: data.legal_name,
      country: data.country,
      doc_path: data.doc_path,
      status: "pending",
    } as never);
    if (insErr) throw new Error(insErr.message);

    // Reflect status on company_profiles (upsert minimal row if missing)
    const { error: upErr } = await context.supabase
      .from("company_profiles")
      .update({ verification_status: "pending" } as never)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("company_profiles")
      .select("verification_status,entity_type")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: latest } = await context.supabase
      .from("verification_requests" as never)
      .select("id,status,kind,legal_name,country,reason,submitted_at,reviewed_at")
      .eq("user_id", context.userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      status: ((profile as { verification_status?: string } | null)?.verification_status ?? "unverified") as
        | "unverified" | "pending" | "verified" | "rejected",
      entity_type: (profile as { entity_type?: string } | null)?.entity_type ?? null,
      latest: latest ?? null,
    };
  });

// ---------------- Admin verification queue ----------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}



export const adminListVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["pending", "verified", "rejected", "all"]).default("pending") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("verification_requests")
      .select("id,user_id,kind,status,legal_name,country,doc_path,reason,submitted_at,reviewed_at,reviewed_by")
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map<string, string | null>();
    (profiles ?? []).forEach((p) => pmap.set(p.id, p.full_name ?? null));
    return (rows ?? []).map((r) => ({ ...r, full_name: pmap.get(r.user_id) ?? null }));
  });

export const adminGetVerificationDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("verification_requests")
      .select("doc_path,status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.doc_path) return { url: null };
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(row.doc_path, 60);
    if (sErr) throw new Error(sErr.message);
    return { url: signed?.signedUrl ?? null };
  });

export const adminDecideVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["verified", "rejected"]),
        reason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: rErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id,user_id,doc_path,status")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!req) throw new Error("Not found");
    if (req.status !== "pending") throw new Error("Already decided");

    // Update request row
    const { error: upErr } = await supabaseAdmin
      .from("verification_requests")
      .update({
        status: data.decision,
        reason: data.decision === "rejected" ? data.reason ?? null : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        doc_path: null,
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    // Reflect on company profile
    await supabaseAdmin
      .from("company_profiles")
      .update({ verification_status: data.decision })
      .eq("user_id", req.user_id);

    // Audit log (no document content, just decision metadata)
    await supabaseAdmin.from("verification_audit").insert({
      request_id: req.id,
      actor_id: context.userId,
      action: data.decision,
      reason: data.decision === "rejected" ? data.reason ?? null : null,
    });

    // Auto-delete the document from storage
    if (req.doc_path) {
      await supabaseAdmin.storage.from("verification-docs").remove([req.doc_path]);
    }

    return { ok: true };
  });


