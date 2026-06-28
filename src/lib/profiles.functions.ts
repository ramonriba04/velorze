import { createServerFn } from "@tanstack/react-start";
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
