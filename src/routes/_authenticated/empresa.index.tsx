import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { Plus, MessageCircle, Briefcase, Rocket, BarChart3, Eye, Heart, Send, Lock } from "lucide-react";
import { useMyPlan, useCompanyUsage } from "@/hooks/usePlan";
import { PlanBadge } from "@/components/PlanBadge";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ProfileCompletenessCard, TrustBadge } from "@/components/ProfileCompletenessCard";
import { companyCompleteness } from "@/lib/completeness";

export const Route = createFileRoute("/_authenticated/empresa/")({
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const { code: planCode, limits, features } = useMyPlan();
  const { data: usage } = useCompanyUsage();

  const { data: profile } = useQuery({
    queryKey: ["company_profile_summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles")
        .select("legal_name, logo_url, description, website, country, contact_email").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["my_projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*")
        .eq("company_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["company_counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [reqs, msgs] = await Promise.all([
        supabase.from("contact_requests").select("*", { count: "exact", head: true }).eq("company_id", user!.id).eq("status", "pending"),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("company_id", user!.id),
      ]);
      return { pending: reqs.count ?? 0, conversations: msgs.count ?? 0 };
    },
  });

  const completion = companyCompleteness(profile ?? {});
  const name = profile?.legal_name ?? user?.email?.split("@")[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6">
      <div className="flex items-center gap-3">
        <EntityAvatar src={profile?.logo_url} name={name} kind="company" size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {t("home.welcomeBack")} <PlanBadge code={planCode} />
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{name || t("nav.profile")}</h1>
        </div>
        <Link to="/empresa/nuevo" className="hidden sm:block">
          <Button className="gap-1 shadow-elegant"><Plus className="h-4 w-4" />{t("nav.newProject")}</Button>
        </Link>
      </div>

      {/* Plan usage row */}
      <Card className="mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("plans.activeProjects")}</p>
            <p className="mt-0.5 text-lg font-semibold">
              {usage?.active ?? 0}
              <span className="text-muted-foreground"> / {limits.max_active_projects ?? "∞"}</span>
            </p>
          </div>
          {limits.max_active_projects !== null && (
            <Progress
              value={Math.min(100, ((usage?.active ?? 0) / Math.max(1, limits.max_active_projects)) * 100)}
              className="h-2 flex-1 min-w-[140px]"
            />
          )}
          {planCode !== "business" && <UpgradeDialog />}
        </div>
        {limits.max_active_projects !== null && (usage?.active ?? 0) >= limits.max_active_projects && (
          <p className="mt-2 text-xs text-warning">{t("plans.capReached")}</p>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Briefcase className="h-4 w-4" />{t("nav.projects")}</div>
          <p className="mt-1 text-2xl font-semibold">{projects?.length ?? 0}</p>
        </Card>
        <Link to="/mensajes">
          <Card className="p-4 hover:shadow-elegant transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><MessageCircle className="h-4 w-4" />{t("home.pendingRequests")}</div>
            <p className="mt-1 text-2xl font-semibold">{counts?.pending ?? 0}</p>
          </Card>
        </Link>
        {completion < 100 && (
          <Link to="/empresa/perfil" className="col-span-2 sm:col-span-1">
            <Card className="p-4 hover:shadow-elegant transition-shadow">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("home.profileComplete")}</span>
                <span className="font-medium text-foreground">{completion}%</span>
              </div>
              <Progress value={completion} className="mt-2 h-2" />
            </Card>
          </Link>
        )}
      </div>

      {/* Analytics */}
      <div className="mt-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("plans.analytics")}</h2>
          {!features.advanced_analytics && <PlanBadge code="free" />}
        </div>
        {!features.advanced_analytics && <UpgradeDialog />}
      </div>
      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Send className="h-4 w-4" />{t("plans.metric.requests")}</div>
          <p className="mt-1 text-2xl font-semibold">{usage?.requests ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Heart className="h-4 w-4" />{t("plans.metric.favorites")}</div>
          <p className="mt-1 text-2xl font-semibold">{usage?.favorites ?? 0}</p>
        </Card>
        <Card className={`p-4 relative ${features.advanced_analytics ? "" : "opacity-70"}`}>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            {features.advanced_analytics ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {t("plans.metric.views")}
          </div>
          <p className="mt-1 text-2xl font-semibold">{features.advanced_analytics ? "—" : t("plans.locked")}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><BarChart3 className="h-4 w-4" />{t("plans.metric.conversion")}</div>
          <p className="mt-1 text-2xl font-semibold">{usage?.conversion ?? 0}%</p>
        </Card>
      </div>


      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("nav.projects")}</h2>
        <Link to="/empresa/nuevo" className="sm:hidden">
          <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />{t("nav.newProject")}</Button>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(!projects || projects.length === 0) && (
          <Card className="md:col-span-2 p-10 text-center border-dashed">
            <Rocket className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{t("home.firstProjectTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t("home.firstProjectSub")}</p>
            <Link to="/empresa/nuevo"><Button className="mt-4">{t("project.createFirst")}</Button></Link>
          </Card>
        )}
        {projects?.map((p: any) => (
          <Card key={p.id} className="overflow-hidden">
            {p.cover_url && (
              <div className="aspect-video bg-muted">
                <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{p.sector} · {p.country} · {p.status}</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link to="/proyectos/$id" params={{ id: p.id }}><Button size="sm" variant="outline">{t("common.view")}</Button></Link>
                <Link to="/empresa/$id/editar" params={{ id: p.id }}><Button size="sm" variant="outline">{t("common.edit")}</Button></Link>
                <Link to="/empresa/$id/inversores" params={{ id: p.id }}><Button size="sm">{t("nav.investors")}</Button></Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
