import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(5000),
  sector: z.string().min(2).max(80),
  investment_type: z.enum(["equity", "prestamo", "joint_venture", "convertible", "otro"]),
  capital_required: z.number().positive(),
  ticket_min: z.number().nonnegative().optional().nullable(),
  ticket_max: z.number().nonnegative().optional().nullable(),
  country: z.string().min(2).max(80),
  stage: z.enum(["idea", "crecimiento", "expansion"]),
  status: z.enum(["draft", "published", "closed"]).default("published"),
  cover_url: z.string().url().optional().nullable().or(z.literal("")),
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

const UpdateSchema = ProjectSchema.partial().extend({ id: z.string().uuid() });

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
