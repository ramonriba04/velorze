import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Lock, Sparkles, Crown, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMyPlan, useCompanyUsage } from "@/hooks/usePlan";
import { useMyRole } from "@/hooks/useAuth";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import type { PlanCode } from "@/lib/plans";

export const Route = createFileRoute("/planes")({
  head: () => ({
    meta: [
      { title: "Plans | Capora" },
      { name: "description", content: "Explore Capora Free, Pro and Business plans — visibility, active projects and advanced analytics." },
      { property: "og:title", content: "Plans | Capora" },
      { property: "og:description", content: "Explore Capora Free, Pro and Business plans — visibility, active projects and advanced analytics." },
      { property: "og:url", content: "https://capora-ai-connect.lovable.app/planes" },
    ],
    links: [{ rel: "canonical", href: "https://capora-ai-connect.lovable.app/planes" }],
  }),
  component: PlansPage,
});

type PlanDef = {
  code: PlanCode;
  icon: typeof Sparkles;
  accent: string;
  ring: string;
  features: string[];
  locked?: string[];
};

const PLANS: PlanDef[] = [
  {
    code: "free",
    icon: Sparkles,
    accent: "text-success",
    ring: "border-success/40",
    features: [
      "planes.feat.free.1",
      "planes.feat.free.2",
      "planes.feat.free.3",
      "planes.feat.free.4",
      "planes.feat.free.5",
    ],
  },
  {
    code: "pro",
    icon: Crown,
    accent: "text-primary",
    ring: "border-primary/40",
    features: [
      "planes.feat.pro.1",
      "planes.feat.pro.2",
      "planes.feat.pro.3",
      "planes.feat.pro.4",
    ],
  },
  {
    code: "business",
    icon: Building2,
    accent: "text-accent",
    ring: "border-accent/40",
    features: [
      "planes.feat.business.1",
      "planes.feat.business.2",
      "planes.feat.business.3",
      "planes.feat.business.4",
      "planes.feat.business.5",
    ],
  },
];

function PlansPage() {
  const { t } = useTranslation();
  const { code: currentCode, limits } = useMyPlan();
  const { user, role } = useMyRole();
  const { data: usage } = useCompanyUsage();

  const cap = limits.max_active_projects ?? null;
  const active = usage?.active ?? 0;
  const pct = cap ? Math.min(100, (active / Math.max(1, cap)) * 100) : 0;

  // Plans are only relevant to publishers (companies). Investors stay fully free.
  if (user && role === "inversor") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("planes.investorTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("planes.investorSub")}</p>
        <Link to="/inversor" className="mt-6 inline-block">
          <Button>{t("nav.home")}</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 pb-20 sm:px-6 md:pb-10">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
      </div>

      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("planes.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("planes.sub")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("planes.freeNotice")}</p>
      </header>


      {user && role === "empresa" && (
        <Card className="mt-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("plans.currentPlan")}</p>
              <p className="text-lg font-semibold capitalize">{currentCode}</p>
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("plans.activeProjects")}</span>
                <span className="font-medium text-foreground">
                  {active} / {cap ?? "∞"}
                </span>
              </div>
              {cap !== null && <Progress value={pct} className="mt-2 h-2" />}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = p.code === currentCode;
          const isComingSoon = p.code !== "free";
          return (
            <Card
              key={p.code}
              className={`relative flex flex-col p-6 ${isCurrent ? `ring-2 ring-offset-2 ring-offset-background ${p.ring}` : ""}`}
            >
              {isComingSoon && (
                <Badge variant="secondary" className="absolute top-4 right-4">
                  {t("plans.comingSoon")}
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="default" className="absolute top-4 right-4">
                  {t("plans.current")}
                </Badge>
              )}

              <div className={`flex items-center gap-2 ${p.accent}`}>
                <Icon className="h-5 w-5" />
                <h2 className="text-xl font-bold capitalize">{p.code}</h2>
              </div>

              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">
                {t(`plans.descriptions.${p.code}`)}
              </p>

              <div className="mt-4">
                <p className="text-3xl font-bold">
                  {p.code === "free" ? t("plans.priceFree") : "—"}
                </p>
                {p.code !== "free" && (
                  <p className="text-xs text-muted-foreground mt-1">{t("planes.priceTba")}</p>
                )}
              </div>

              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {p.features.map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.accent}`} />
                    <span>{t(k)}</span>
                  </li>
                ))}
                {p.code === "free" && (
                  <>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t("plans.f.advanced_analytics")}</span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t("plans.f.featured")}</span>
                    </li>
                  </>
                )}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    {t("plans.current")}
                  </Button>
                ) : (
                  <UpgradeDialog>
                    <Button className="w-full" variant="secondary" disabled>
                      {t("plans.comingSoon")}
                    </Button>
                  </UpgradeDialog>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {t("plans.disclaimer")}
      </p>
    </main>
  );
}
