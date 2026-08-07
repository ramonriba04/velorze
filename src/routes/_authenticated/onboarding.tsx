import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingComplete } from "@/lib/account.functions";
import { requestAppTour } from "@/components/onboarding/AppTour";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, Sparkles, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Step = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  ctaLabel: string;
  ctaTo: string;
};

function Onboarding() {
  const { t } = useTranslation();
  const { user, role, loading } = useMyRole();
  const navigate = useNavigate();
  const finish = useServerFn(markOnboardingComplete);
  const [finished, setFinished] = useState(false);

  const isCompany = role === "empresa";

  const { data: investor } = useQuery({
    queryKey: ["onboarding_investor", user?.id],
    enabled: !!user && role === "inversor",
    queryFn: async () => {
      const { data } = await supabase.from("investor_profiles")
        .select("display_name, sectors, countries, investment_types, description, avatar_url")
        .eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: company } = useQuery({
    queryKey: ["onboarding_company", user?.id],
    enabled: !!user && isCompany,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles")
        .select("legal_name, logo_url, description, country, website")
        .eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: projectCount } = useQuery({
    queryKey: ["onboarding_projects", user?.id],
    enabled: !!user && isCompany,
    queryFn: async () => {
      const { count } = await supabase.from("projects")
        .select("*", { count: "exact", head: true }).eq("company_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: hasPublished } = useQuery({
    queryKey: ["onboarding_published", user?.id],
    enabled: !!user && isCompany,
    queryFn: async () => {
      const { count } = await supabase.from("projects")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user!.id).eq("status", "published");
      return (count ?? 0) > 0;
    },
  });

  const steps: Step[] = isCompany
    ? [
        {
          key: "profile",
          title: t("onboarding.company.s1Title"),
          description: t("onboarding.company.s1Desc"),
          done: !!(company?.legal_name && company?.description && company?.country),
          ctaLabel: t("onboarding.company.s1Cta"),
          ctaTo: "/empresa/perfil",
        },
        {
          key: "logo",
          title: t("onboarding.company.s2Title"),
          description: t("onboarding.company.s2Desc"),
          done: !!company?.logo_url,
          ctaLabel: t("onboarding.company.s2Cta"),
          ctaTo: "/empresa/perfil",
        },
        {
          key: "project",
          title: t("onboarding.company.s3Title"),
          description: t("onboarding.company.s3Desc"),
          done: (projectCount ?? 0) > 0,
          ctaLabel: t("onboarding.company.s3Cta"),
          ctaTo: "/empresa/nuevo",
        },
        {
          key: "publish",
          title: t("onboarding.company.s4Title"),
          description: t("onboarding.company.s4Desc"),
          done: !!hasPublished,
          ctaLabel: t("onboarding.company.s4Cta"),
          ctaTo: "/empresa",
        },
      ]
    : [
        {
          key: "profile",
          title: t("onboarding.investor.s1Title"),
          description: t("onboarding.investor.s1Desc"),
          done: !!(investor?.display_name && investor?.description),
          ctaLabel: t("onboarding.investor.s1Cta"),
          ctaTo: "/inversor/perfil",
        },
        {
          key: "interests",
          title: t("onboarding.investor.s2Title"),
          description: t("onboarding.investor.s2Desc"),
          done: !!(investor?.sectors?.length && investor?.countries?.length),
          ctaLabel: t("onboarding.investor.s2Cta"),
          ctaTo: "/inversor/perfil",
        },
        {
          key: "preferences",
          title: t("onboarding.investor.s3Title"),
          description: t("onboarding.investor.s3Desc"),
          done: !!investor?.investment_types?.length,
          ctaLabel: t("onboarding.investor.s3Cta"),
          ctaTo: "/inversor/perfil",
        },
        {
          key: "explore",
          title: t("onboarding.investor.s4Title"),
          description: t("onboarding.investor.s4Desc"),
          done: false,
          ctaLabel: t("onboarding.investor.s4Cta"),
          ctaTo: "/inversor",
        },
      ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  const done = async (skip = false) => {
    try {
      await finish({ data: undefined as any });
    } catch {
      // non-blocking
    }
    requestAppTour();
    if (skip) {
      navigate({ to: isCompany ? "/empresa" : "/inversor" });
      return;
    }
    setFinished(true);
  };

  if (loading) return <PageLoading />;
  if (!role) return null;

  if (finished) {
    return (
      <div className="mx-auto max-w-md p-4 py-16 sm:p-6">
        <Card className="space-y-4 p-8 text-center">
          <PartyPopper aria-hidden className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("onboarding.doneTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("onboarding.doneSub")}</p>
          <Button
            className="w-full"
            onClick={() => navigate({ to: isCompany ? "/empresa" : "/inversor" })}
          >
            {t("onboarding.doneCta")}
          </Button>
        </Card>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {t("onboarding.badge")}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("onboarding.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("onboarding.sub")}</p>
      </header>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t("onboarding.progress")}</span>
          <span className="text-muted-foreground">{doneCount} / {steps.length}</span>
        </div>
        <Progress value={progress} />
      </Card>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Card className={`flex items-start gap-4 p-4 ${s.done ? "opacity-70" : ""}`}>
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("onboarding.stepLabel", { n: i + 1 })}
                  </span>
                </div>
                <h3 className="font-medium leading-tight">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              </div>
              <Link to={s.ctaTo as any} className="shrink-0">
                <Button variant={s.done ? "outline" : "default"} size="sm">
                  {s.done ? t("common.edit") : s.ctaLabel}
                </Button>
              </Link>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={() => done(true)}>
          {t("onboarding.skip")}
        </Button>
        <Button onClick={() => done(false)} disabled={doneCount === 0}>
          {doneCount === steps.length ? t("onboarding.finish") : t("onboarding.continue")}
        </Button>
      </div>
    </div>
  );
}
