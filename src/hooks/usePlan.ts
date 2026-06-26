import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import type { PlanCode, PlanRow, PlanFeatures, PlanLimits } from "@/lib/plans";

const FREE_FALLBACK: PlanRow = {
  code: "free",
  name: "Free",
  price_cents: 0,
  currency: "EUR",
  sort_order: 0,
  limits: { max_active_projects: 1, max_featured_projects: 0, team_members: 1 },
  features: {
    basic_stats: true,
    advanced_analytics: false,
    featured_projects: false,
    priority_visibility: false,
    team_members: false,
    dashboard_exports: false,
    priority_support: false,
  },
};

export function usePlans() {
  return useQuery({
    queryKey: ["plans_all"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PlanRow[];
    },
  });
}

export function useMyPlan() {
  const { user } = useMyRole();
  const { data: plans } = usePlans();

  const { data: row } = useQuery({
    queryKey: ["my_plan", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plan")
        .select("plan_code, billing_status, current_period_end, started_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const code: PlanCode = (row?.plan_code as PlanCode) ?? "free";
  const plan = plans?.find((p) => p.code === code) ?? FREE_FALLBACK;

  return {
    code,
    plan,
    limits: plan.limits as PlanLimits,
    features: plan.features as PlanFeatures,
    billingStatus: row?.billing_status ?? "inactive",
    isLoading: !plans,
  };
}

export function useFeatureFlag(key: string) {
  const { data } = useQuery({
    queryKey: ["flag", key],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("enabled, payload")
        .eq("key", key)
        .maybeSingle();
      return data;
    },
  });
  return { enabled: !!data?.enabled, payload: (data?.payload ?? {}) as Record<string, unknown> };
}

export function useCompanyUsage() {
  const { user } = useMyRole();
  return useQuery({
    queryKey: ["company_usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [active, total, req, fav] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true })
          .eq("company_id", user!.id).eq("status", "published"),
        supabase.from("projects").select("*", { count: "exact", head: true })
          .eq("company_id", user!.id),
        supabase.from("contact_requests").select("*", { count: "exact", head: true })
          .eq("company_id", user!.id),
        supabase.from("favorites").select("project_id, projects!inner(company_id)", { count: "exact", head: true })
          .eq("projects.company_id", user!.id),
      ]);
      const accepted = await supabase.from("contact_requests")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user!.id).eq("status", "accepted");
      const reqTotal = req.count ?? 0;
      const accCount = accepted.count ?? 0;
      const conversion = reqTotal > 0 ? Math.round((accCount / reqTotal) * 100) : 0;
      return {
        active: active.count ?? 0,
        total: total.count ?? 0,
        requests: reqTotal,
        accepted: accCount,
        favorites: fav.count ?? 0,
        conversion,
      };
    },
  });
}
