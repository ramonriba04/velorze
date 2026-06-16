import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getRecommendedProjects } from "@/lib/matching.functions";
import { toggleFavorite, createContactRequest } from "@/lib/contact.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { Heart, MapPin, TrendingUp, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inversor/")({
  component: InvestorDashboard,
});

function scoreColor(s: number) {
  if (s >= 75) return "bg-success text-success-foreground";
  if (s >= 50) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function InvestorDashboard() {
  const { t } = useTranslation();
  const fetcher = useServerFn(getRecommendedProjects);
  const favFn = useServerFn(toggleFavorite);
  const reqFn = useServerFn(createContactRequest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["recommended"],
    queryFn: () => fetcher(),
  });

  // Fetch company logos for visible projects
  const companyIds = Array.from(new Set((data?.items ?? []).map((i: any) => i.project.company_id)));
  const { data: companies } = useQuery({
    queryKey: ["recommended_companies", companyIds.join(",")],
    enabled: companyIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_profiles")
        .select("user_id, legal_name, logo_url")
        .in("user_id", companyIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((c: any) => (map[c.user_id] = c));
      return map;
    },
  });

  const favMut = useMutation({
    mutationFn: (project_id: string) => favFn({ data: { project_id } }),
    onSuccess: (r) => toast.success(r.favorited ? t("project.addedFavorite") : t("project.removedFavorite")),
  });

  const reqMut = useMutation({
    mutationFn: (project_id: string) => reqFn({ data: { project_id } }),
    onSuccess: () => toast.success(t("project.requestSent")),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("project.recommended")}</h1>
          <p className="text-sm text-muted-foreground">{t("project.recommendedSub")}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inversor/perfil"><Button variant="outline" size="sm">{t("nav.profile")}</Button></Link>
          <Link to="/inversor/favoritos"><Button variant="outline" size="sm">{t("nav.favorites")}</Button></Link>
          <Link to="/inversor/solicitudes"><Button variant="outline" size="sm">{t("nav.requests")}</Button></Link>
        </div>
      </div>

      {data && !data.hasProfile && (
        <Card className="mt-6 p-4 border-warning/40 bg-warning/10">
          <p className="text-sm">{t("project.completeProfile")}</p>
          <Link to="/inversor/perfil"><Button size="sm" className="mt-2">{t("nav.profile")}</Button></Link>
        </Card>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-muted-foreground col-span-full">{t("common.loading")}</p>}
        {data?.items.length === 0 && <p className="text-muted-foreground col-span-full">{t("project.noProjects")}</p>}
        {data?.items.map(({ project, match }) => {
          const company = companies?.[project.company_id];
          return (
            <Card key={project.id} className="overflow-hidden flex flex-col">
              {project.cover_url && (
                <div className="aspect-video bg-muted">
                  <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityAvatar src={company?.logo_url} name={company?.legal_name} kind="company" size={32} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base leading-tight truncate">{project.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{company?.legal_name ?? ""}</p>
                    </div>
                  </div>
                  <Badge className={scoreColor(match.score)}>{match.score}%</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{project.sector}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{project.country}</span>
                  <Badge variant="outline">{t(`stage.${project.stage}`)}</Badge>
                  <Badge variant="outline">{t(`investmentType.${project.investment_type}`)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                {match.reasons.length > 0 && (
                  <p className="text-xs text-primary">{t("project.matchReasons")}: {match.reasons.join(" · ")}</p>
                )}
                <div className="mt-auto flex gap-2 pt-2">
                  <Link to="/proyectos/$id" params={{ id: project.id }} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">{t("project.viewProject")}</Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => { favMut.mutate(project.id); qc.invalidateQueries({ queryKey: ["favorites"] }); }}>
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={() => reqMut.mutate(project.id)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
