import { Crown, Sparkles, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PLAN_BADGE_VARIANT, type PlanCode } from "@/lib/plans";

const ICONS: Record<PlanCode, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  pro: Crown,
  business: Building2,
};

export function PlanBadge({ code, className }: { code: PlanCode; className?: string }) {
  const Icon = ICONS[code];
  const label = code === "free" ? "Free" : code === "pro" ? "Pro" : "Business";
  return (
    <Badge variant={PLAN_BADGE_VARIANT[code]} className={`gap-1 ${className ?? ""}`}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}
