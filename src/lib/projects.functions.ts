import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const INVESTMENT_TYPES = [
  "equity","debt","convertible","revenue_share","crowdfunding","angel","venture",
  "private_equity","strategic","joint_venture","prestamo","otro",
] as const;
const STAGES = ["idea","mvp","early_revenue","growth","expansion","mature","crecimiento"] as const;

const trimmedStr = (min: number, max: number) =>
  z.string().transform((s) => s.trim().replace(/\s{2,}/g, " ")).pipe(z.string().min(min).max(max));

const ProjectBase = z.object({
  title: trimmedStr(5, 120),
  description: trimmedStr(20, 1000),
  sector: trimmedStr(2, 50),
  investment_type: z.enum(INVESTMENT_TYPES),
  capital_required: z.number().positive(),
  ticket_min: z.number().nonnegative().optional().nullable(),
  ticket_max: z.number().nonnegative().optional().nullable(),
  country: trimmedStr(2, 80),
  stage: z.enum(STAGES),
  status: z.enum(["draft", "published", "closed"]).default("published"),
  cover_url: z.string().url().optional().nullable().or(z.literal("")),
});
const ticketCheck = (d: { ticket_min?: number | null; ticket_max?: number | null }) =>
  d.ticket_min == null || d.ticket_max == null || d.ticket_max >= d.ticket_min;
const ProjectSchema = ProjectBase.refine(ticketCheck, {
  message: "ticket_max must be >= ticket_min",
  path: ["ticket_max"],
});


export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProjectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ ...data, company_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const UpdateSchema = ProjectBase.partial().extend({ id: z.string().uuid() }).refine(ticketCheck, {
  message: "ticket_max must be >= ticket_min",
  path: ["ticket_max"],
});


export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("projects")
      .update(rest)
      .eq("id", id)
      .eq("company_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("company_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
