import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { getRecommendedProjects } from "@/lib/matching.functions";
import { toggleFavorite, createContactRequest } from "@/lib/contact.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { EntityTypeBadge } from "@/components/EntityTypeBadge";
import {
  Heart, MapPin, TrendingUp, Send, MessageCircle, Sparkles, Compass,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectGridSkeleton } from "@/components/ui/skeletons";


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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["recommended"],
    queryFn: () => fetcher(),
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["favorites_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("project_id")
        .eq("investor_id", user!.id);
      return new Set((data ?? []).map((f: any) => f.project_id));
    },
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

  const items = (data?.items ?? []).filter((i: any) => (i.match?.score ?? 0) > 0 || data?.hasProfile === false);
  const companyIds = Array.from(new Set(items.map((i: any) => i.project.company_id)));
  const { data: companies } = useQuery({
    queryKey: ["recommended_companies", companyIds.join(",")],
    enabled: companyIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles")
        .select("user_id, legal_name, logo_url, entity_type").in("user_id", companyIds);
      const map: Record<string, any> = {};
      (data ?? []).forEach((c: any) => (map[c.user_id] = c));
      return map;
    },
  });

  const favMut = useMutation({
    mutationFn: (project_id: string) => favFn({ data: { project_id } }),
    onSuccess: (r) => {
      toast.success(r.favorited ? t("project.addedFavorite") : t("project.removedFavorite"));
      qc.invalidateQueries({ queryKey: ["investor_counts"] });
      qc.invalidateQueries({ queryKey: ["favorites_ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });
  const reqMut = useMutation({
    mutationFn: (project_id: string) => reqFn({ data: { project_id } }),
    onSuccess: () => toast.success(t("project.requestSent")),
    onError: (e) => toast.error((e as Error).message),
  });

  const completionItems = [
    !!profile?.avatar_url,
    !!(profile?.description && profile.description.length > 30),
    (profile?.sectors ?? []).length > 0,
    (profile?.countries ?? []).length > 0,
    !!profile?.display_name,
  ];
  const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);
  const greetingName = profile?.display_name ?? user?.email?.split("@")[0] ?? "";

  const hasProfile = data?.hasProfile !== false;
  const compatibleItems = (data?.items ?? []).filter((i: any) => (i.match?.score ?? 0) >= 40);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

      {/* Recommendations header */}
      <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("project.recommended")}</h2>
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">
            {t("project.recommendedBadge")}
          </Badge>
        </div>
        <Link to="/proyectos">
          <Button variant="outline" size="sm">{t("project.exploreMore")}</Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t("project.recommendedSub")}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full">
            <ProjectGridSkeleton count={6} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
          </div>
        )}


        {!isLoading && !hasProfile && (
          <Card className="md:col-span-2 lg:col-span-3 p-10 text-center border-dashed">
            <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{t("home.noRecommendations")}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t("home.noRecommendationsSub")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/inversor/perfil"><Button size="sm">{t("home.completeProfileCta")}</Button></Link>
              <Link to="/proyectos"><Button size="sm" variant="outline">{t("project.exploreMore")}</Button></Link>
            </div>
          </Card>
        )}

        {!isLoading && hasProfile && compatibleItems.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 p-10 text-center border-dashed">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{t("home.noMatchesYetTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t("home.noMatchesYetSub")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/proyectos"><Button size="sm">{t("project.exploreMore")}</Button></Link>
            </div>
          </Card>
        )}

        {!isLoading && hasProfile && compatibleItems.map(({ project, match }: any) => {
          const company = companies?.[project.company_id];
          const isOpen = !!expanded[project.id];
          const chips: { key: string; label: string }[] = [];
          (match.reasons ?? []).forEach((r: string) => {
            if (r.startsWith("Sector ")) chips.push({ key: "sector", label: r.replace("Sector ", "") });
            else if (r.startsWith("País ")) chips.push({ key: "country", label: r.replace("País ", "") });
            else if (r.startsWith("Ticket")) chips.push({ key: "ticket", label: t("project.ticketMin") });
            else if (r.startsWith("Tipo ")) chips.push({ key: "type", label: t(`investmentType.${r.replace("Tipo ", "")}`) });
          });
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
                  <Badge className={scoreColor(match.score)}>{match.score}% {t("project.match").toLowerCase()}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <EntityTypeBadge type={company?.entity_type} size="xs" />
                  <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{project.sector}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{project.country}</span>
                  <Badge variant="outline">{t(`stage.${project.stage}`)}</Badge>
                  <Badge variant="outline">{t(`investmentType.${project.investment_type}`)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>

                {chips.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [project.id]: !e[project.id] }))}
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                      aria-expanded={isOpen}
                    >
                      {t("project.whyMatch")}
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {isOpen && (
                      <div className="mt-2 rounded-md border bg-primary/5 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {t("project.matchesLabel")}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {chips.map((c) => (
                            <Badge key={c.key + c.label} variant="secondary" className="text-xs">
                              ✓ {c.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-2">
                  <Link to="/proyectos/$id" params={{ id: project.id }} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">{t("project.viewProject")}</Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="min-h-11 min-w-11"
                    aria-label={favoriteIds?.has(project.id) ? t("project.removedFavorite") : t("project.addedFavorite")}
                    aria-pressed={favoriteIds?.has(project.id) ? true : false}
                    onClick={() => favMut.mutate(project.id)}
                  >
                    <Heart aria-hidden className={`h-4 w-4 ${favoriteIds?.has(project.id) ? "fill-current text-primary" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={t("project.contactCompany")}
                    onClick={() => reqMut.mutate(project.id)}
                  >
                    <Send aria-hidden className="h-4 w-4" />
                  </Button>
                </div>

              </div>
            </Card>
          );
        })}
      </div>

      {!isLoading && hasProfile && compatibleItems.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Link to="/proyectos">
            <Button variant="outline">{t("project.exploreMore")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
