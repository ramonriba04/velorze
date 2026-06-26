// Shared plan metadata — keep in sync with subscription_plans table.

export type PlanCode = "free" | "pro" | "business";

export type PlanLimits = {
  max_active_projects: number | null;
  max_featured_projects: number | null;
  team_members: number | null;
};

export type PlanFeatures = {
  basic_stats: boolean;
  advanced_analytics: boolean;
  featured_projects: boolean;
  priority_visibility: boolean;
  team_members: boolean;
  dashboard_exports: boolean;
  priority_support: boolean;
};

export type PlanRow = {
  code: PlanCode;
  name: string;
  price_cents: number;
  currency: string;
  sort_order: number;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLAN_ORDER: PlanCode[] = ["free", "pro", "business"];

export const PLAN_BADGE_VARIANT: Record<PlanCode, "secondary" | "default" | "outline"> = {
  free: "secondary",
  pro: "default",
  business: "outline",
};
