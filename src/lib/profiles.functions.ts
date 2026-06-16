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

const InvestorProfileSchema = z.object({
  kind: z.enum(["personal", "corporativo"]),
  display_name: z.string().max(120).optional().nullable(),
  sectors: z.array(z.string().max(40)).max(20),
  ticket_min: z.number().nonnegative().optional().nullable(),
  ticket_max: z.number().nonnegative().optional().nullable(),
  countries: z.array(z.string().max(40)).max(20),
  investment_types: z.array(z.enum(["equity", "prestamo", "joint_venture", "convertible", "otro"])).max(10),
  risk_level: z.enum(["bajo", "medio", "alto"]),
  description: z.string().max(2000).optional().nullable(),
  avatar_url: z.string().url().optional().or(z.literal("")).nullable(),
});

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
  legal_name: z.string().min(2).max(200),
  website: z.string().url().max(200).optional().or(z.literal("")).nullable(),
  country: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
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
