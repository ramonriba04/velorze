import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ChatUserContext = {
  authenticated: boolean;
  userId?: string;
  role?: "empresa" | "inversor" | "admin" | null;
  profile?: {
    full_name?: string | null;
    locale?: string | null;
  };
  investor?: Record<string, unknown> | null;
  company?: Record<string, unknown> | null;
  projects?: Array<Record<string, unknown>>;
  topMatches?: Array<Record<string, unknown>>;
};

export async function loadChatContext(authHeader: string | null): Promise<ChatUserContext> {
  if (!authHeader?.startsWith("Bearer ")) return { authenticated: false };
  const token = authHeader.slice(7);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) return { authenticated: false };

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claims } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (!userId) return { authenticated: false };

  const [profileRes, roleRes] = await Promise.all([
    supabase.from("profiles").select("full_name,locale").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
  ]);
  const role = (roleRes.data?.role as ChatUserContext["role"]) ?? null;

  const ctx: ChatUserContext = {
    authenticated: true,
    userId,
    role,
    profile: profileRes.data ?? undefined,
  };

  if (role === "inversor") {
    const { data: investor } = await supabase
      .from("investor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    ctx.investor = investor as Record<string, unknown> | null;

    const { data: matches } = await supabase
      .from("match_scores")
      .select("score, project_id, projects(title, sector, country, ticket_min, ticket_max, stage, description)")
      .eq("investor_id", userId)
      .order("score", { ascending: false })
      .limit(8);
    ctx.topMatches = (matches ?? []) as Array<Record<string, unknown>>;
  } else if (role === "empresa") {
    const { data: company } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    ctx.company = company as Record<string, unknown> | null;

    const { data: projects } = await supabase
      .from("projects")
      .select("id,title,sector,country,ticket_min,ticket_max,stage,status,summary")
      .eq("company_id", userId)
      .limit(10);
    ctx.projects = (projects ?? []) as Array<Record<string, unknown>>;
  }

  return ctx;
}

export function buildSystemPrompt(ctx: ChatUserContext, locale: "es" | "en" = "es"): string {
  const safety = locale === "es"
    ? "Esta información es solo informativa y no constituye asesoramiento financiero. Nunca recomiendes inversiones específicas, predigas retornos, estimes ganancias, ni des asesoramiento legal o financiero."
    : "This information is informational only and is not financial advice. Never recommend specific investments, predict returns, estimate profits, or give legal or financial advice.";

  const intro = locale === "es"
    ? "Eres Capora Assistant, un asistente para Capora, un marketplace que conecta empresas con inversores privados. Ayudas a los usuarios a descubrir y entender oportunidades ya disponibles en la plataforma."
    : "You are Capora Assistant, an assistant for Capora, a marketplace that connects companies with private investors. You help users discover and understand opportunities already available on the platform.";

  const rules = locale === "es"
    ? [
        "Modos: (1) Descubrimiento de oportunidades, (2) Explicación de compatibilidad (matching), (3) Mejora de perfiles/proyectos.",
        "Responde en el idioma del usuario (español o inglés).",
        "Sé conciso, claro y útil. Usa listas cuando ayude.",
        "Si te piden algo fuera de alcance (asesoramiento financiero/legal, predicciones, ejecución de inversiones), recuérdale al usuario amablemente que no puedes hacerlo y redirige hacia descubrir información de la plataforma.",
        "Cuando hables de matching, explica los factores: sector (30%), ticket (25%), país (15%), tipo de inversión (15%), riesgo (10%).",
      ].join("\n- ")
    : [
        "Modes: (1) Opportunity discovery, (2) Match explanation, (3) Profile/project improvement.",
        "Reply in the user's language (Spanish or English).",
        "Be concise, clear and useful. Use lists when helpful.",
        "If asked for out-of-scope items (financial/legal advice, predictions, executing investments), kindly remind the user you cannot, and redirect to discovering platform information.",
        "When discussing matching, explain factors: sector (30%), ticket (25%), country (15%), investment type (15%), risk (10%).",
      ].join("\n- ");

  if (!ctx.authenticated) {
    return [
      intro,
      `- ${rules}`,
      `Disclaimer: ${safety}`,
      locale === "es"
        ? "El usuario no ha iniciado sesión. Anímalo a registrarse para recibir recomendaciones personalizadas."
        : "The user is not signed in. Encourage them to sign up to receive personalized recommendations.",
    ].join("\n\n");
  }

  const ctxJson = JSON.stringify(
    {
      role: ctx.role,
      profile: ctx.profile,
      investor: ctx.investor,
      company: ctx.company,
      projects: ctx.projects,
      topMatches: ctx.topMatches,
    },
    null,
    2,
  );

  return [
    intro,
    `- ${rules}`,
    `Disclaimer obligatorio / Required disclaimer: ${safety}`,
    locale === "es"
      ? "Contexto del usuario actual (no lo cites textualmente, úsalo para personalizar respuestas):"
      : "Current user context (do not quote verbatim, use it to personalize responses):",
    "```json",
    ctxJson,
    "```",
  ].join("\n\n");
}
