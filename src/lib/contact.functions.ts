import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createContactRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        message: z.string().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("id, company_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!project) throw new Error("Project not found");

    const { error } = await context.supabase.from("contact_requests").upsert(
      {
        investor_id: context.userId,
        project_id: project.id,
        company_id: project.company_id,
        message: data.message ?? null,
        status: "pending",
      },
      { onConflict: "investor_id,project_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondContactRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["accepted", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("contact_requests")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("company_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        body: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversation_id,
      sender_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .neq("sender_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("favorites")
      .select("id")
      .eq("investor_id", context.userId)
      .eq("project_id", data.project_id)
      .maybeSingle();

    if (existing) {
      await context.supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    const { error } = await context.supabase
      .from("favorites")
      .insert({ investor_id: context.userId, project_id: data.project_id });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });
