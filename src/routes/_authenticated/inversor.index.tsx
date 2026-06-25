import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getRecommendedProjects } from "@/lib/matching.functions";
import { toggleFavorite, createContactRequest } from "@/lib/contact.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { Heart, MapPin, TrendingUp, Send, MessageCircle, Sparkles, Compass } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inversor/")({
  component: InvestorDashboard,
});

function scoreColor(s: number) {
  if (s >= 90) return "bg-success text-success-foreground";
  if (s >= 70) return "bg-primary text-primary-foreground";
  if (s >= 50) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}


function InvestorDashboard() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const fetcher = useServerFn(getRecommendedProjects);
  const favFn = useServerFn(toggleFavorite);
  const reqFn = useServerFn(createContactRequest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["recommended"],
    queryFn: () => fetcher(),
  });

  const { data: profile } = useQuery({
    queryKey: ["investor_profile_summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("investor_profiles")
        .select("display_name, avatar_url, description, sectors, countries").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["investor_counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [fav, msg] = await Promise.all([
        supabase.from("favorites").select("*", { count: "exact", head: true }).eq("investor_id", user!.id),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("investor_id", user!.id),
      ]);
      return { favorites: fav.count ?? 0, conversations: msg.count ?? 0 };
    },
  });

  const companyIds = Array.from(new Set((data?.items ?? []).map((i: any) => i.project.company_id)));
  const { data: companies } = useQuery({
    queryKey: ["recommended_companies", companyIds.join(",")],
    enabled: companyIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles")
        .select("user_id, legal_name, logo_url").in("user_id", companyIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((c: any) => (map[c.user_id] = c));
      return map;
    },
  });

  const favMut = useMutation({
    mutationFn: (project_id: string) => favFn({ data: { project_id } }),
    onSuccess: (r) => { toast.success(r.favorited ? t("project.addedFavorite") : t("project.removedFavorite")); qc.invalidateQueries({ queryKey: ["investor_counts"] }); },
  });
  const reqMut = useMutation({
    mutationFn: (project_id: string) => reqFn({ data: { project_id } }),
    onSuccess: () => toast.success(t("project.requestSent")),
    onError: (e) => toast.error((e as Error).message),
  });

  // Completion score
  const completionItems = [
    !!profile?.avatar_url,
    !!(profile?.description && profile.description.length > 30),
    (profile?.sectors ?? []).length > 0,
    (profile?.countries ?? []).length > 0,
    !!profile?.display_name,
  ];
  const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);
  const greetingName = profile?.display_name ?? user?.email?.split("@")[0] ?? "";

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6">
      {/* Welcome */}
      <div className="flex items-center gap-3">
        <EntityAvatar src={profile?.avatar_url} name={greetingName} size={48} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("home.welcomeBack")}</p>
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{greetingName || t("nav.profile")}</h1>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link to="/inversor/favoritos">
          <Card className="p-4 hover:shadow-elegant transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Heart className="h-4 w-4" />{t("nav.favorites")}</div>
            <p className="mt-1 text-2xl font-semibold">{counts?.favorites ?? 0}</p>
          </Card>
        </Link>
        <Link to="/mensajes">
          <Card className="p-4 hover:shadow-elegant transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><MessageCircle className="h-4 w-4" />{t("nav.messages")}</div>
            <p className="mt-1 text-2xl font-semibold">{counts?.conversations ?? 0}</p>
          </Card>
        </Link>
        {completion < 100 && (
          <Link to="/inversor/perfil" className="col-span-2 sm:col-span-1">
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

      {/* Recommendations */}
      <div className="mt-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("project.recommended")}</h2>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t("project.recommendedSub")}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-muted-foreground col-span-full">{t("common.loading")}</p>}
        {!isLoading && items.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 p-10 text-center border-dashed">
            <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{t("home.noRecommendations")}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t("home.noRecommendationsSub")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/inversor/perfil"><Button variant="outline" size="sm">{t("home.completeProfileCta")}</Button></Link>
              <Link to="/inversor/favoritos"><Button size="sm">{t("empty.exploreCta")}</Button></Link>
            </div>
          </Card>
        )}
        {items.map(({ project, match }) => {
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
