import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Best-effort cleanup of user-owned rows. RLS-protected tables are also
    // cascaded by the auth.users delete via the profiles FK chain, but we
    // remove app data explicitly to keep things tidy.
    await supabaseAdmin.from("favorites").delete().eq("investor_id", userId);
    await supabaseAdmin.from("messages").delete().eq("sender_id", userId);
    await supabaseAdmin.from("contact_requests").delete().or(`investor_id.eq.${userId},company_id.eq.${userId}`);
    await supabaseAdmin.from("projects").delete().eq("company_id", userId);
    await supabaseAdmin.from("investor_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("company_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
