import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ImageSchema = z.object({ url: z.string().url(), storage_path: z.string().nullable().optional() });

export const setProjectImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ project_id: z.string().uuid(), images: z.array(ImageSchema).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // verify ownership
    const { data: project } = await context.supabase
      .from("projects")
      .select("id, company_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!project || project.company_id !== context.userId) throw new Error("Not authorized");

    // replace all images for this project
    const { error: delErr } = await context.supabase
      .from("project_images")
      .delete()
      .eq("project_id", data.project_id);
    if (delErr) throw new Error(delErr.message);

    if (data.images.length > 0) {
      const rows = data.images.map((img, i) => ({
        project_id: data.project_id,
        url: img.url,
        storage_path: img.storage_path ?? null,
        sort_order: i,
      }));
      const { error: insErr } = await context.supabase.from("project_images").insert(rows);
      if (insErr) throw new Error(insErr.message);

      // first image becomes cover_url if none set
      await context.supabase
        .from("projects")
        .update({ cover_url: data.images[0].url })
        .eq("id", data.project_id)
        .eq("company_id", context.userId);
    } else {
      await context.supabase
        .from("projects")
        .update({ cover_url: null })
        .eq("id", data.project_id)
        .eq("company_id", context.userId);
    }
    return { ok: true };
  });
