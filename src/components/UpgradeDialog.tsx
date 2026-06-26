import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePlans, useMyPlan } from "@/hooks/usePlan";
import type { PlanCode } from "@/lib/plans";

type Props = { children?: React.ReactNode; defaultOpen?: boolean };

const PLAN_FEATURE_KEYS: Record<PlanCode, string[]> = {
  free: ["plans.f.basic_stats", "plans.f.matching", "plans.f.discover"],
  pro: ["plans.f.up_to_5", "plans.f.advanced_analytics", "plans.f.featured", "plans.f.priority"],
  business: ["plans.f.unlimited_projects", "plans.f.team", "plans.f.exports", "plans.f.support"],
};

export function UpgradeDialog({ children, defaultOpen }: Props) {
  const { t } = useTranslation();
  const { data: plans } = usePlans();
  const { code: currentCode } = useMyPlan();
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="default" className="gap-1">
            <Sparkles className="h-4 w-4" /> {t("plans.upgrade")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("plans.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("plans.dialogSub")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((p) => {
            const isCurrent = p.code === currentCode;
            return (
              <div key={p.code} className="rounded-lg border border-border p-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  {isCurrent && <Badge variant="secondary">{t("plans.current")}</Badge>}
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {p.price_cents > 0
                    ? new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.price_cents / 100)
                    : t("plans.priceFree")}
                  {p.price_cents > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {PLAN_FEATURE_KEYS[p.code as PlanCode].map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-success" />
                      <span>{t(k)}</span>
                    </li>
                  ))}
                  {p.code === "free" && (
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4" /> <span>{t("plans.f.no_advanced")}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="mt-4"
                  disabled
                  variant={isCurrent ? "outline" : p.code === "free" ? "ghost" : "default"}
                >
                  {isCurrent ? t("plans.current") : t("plans.comingSoon")}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{t("plans.disclaimer")}</p>
      </DialogContent>
    </Dialog>
  );
}
