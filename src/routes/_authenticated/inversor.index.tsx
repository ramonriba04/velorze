import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { getRecommendedProjects } from "@/lib/matching.functions";
import { createContactRequest } from "@/lib/contact.functions";
import { useFavorites } from "@/hooks/useFavorite";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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

function scoreStyle(s: number) {
  if (s >= 90) return { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" };
  if (s >= 70) return { pill: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" };
  if (s >= 50) return { pill: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" };
  return { pill: "bg-gray-100 text-gray-500 border border-gray-200", dot: "bg-gray-400" };
}

function MatchScorePill({ score, label }: { score: number; label: string }) {
  const { pill, dot } = scoreStyle(score);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {score}% {label}
    </span>
  );
}

function InvestorDashboard() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const fetcher = useServerFn(getRecommendedProjects);

  const reqFn = useServerFn(createContactRequest);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["recommended"],
    queryFn: () => fetcher(),
  });

  const favorites = useFavorites();

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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      {/* Welcome */}
      <div className="flex items-center gap-4">
        <EntityAvatar src={profile?.avatar_url} name={greetingName} size={48} />
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{t("home.welcomeBack")}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{greetingName || t("nav.profile")}</h1>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link to="/inversor/favoritos">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <Heart className="h-3.5 w-3.5" />
              {t("nav.favorites")}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{counts?.favorites ?? 0}</p>
          </div>
        </Link>
        <Link to="/mensajes">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <MessageCircle className="h-3.5 w-3.5" />
              {t("nav.messages")}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{counts?.conversations ?? 0}</p>
          </div>
        </Link>
        {completion < 100 && (
          <Link to="/inversor/perfil" className="col-span-2 sm:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>{t("home.profileComplete")}</span>
                <span className="font-semibold text-slate-900">{completion}%</span>
              </div>
              <Progress value={completion} className="mt-3 h-1.5" />
            </div>
          </Link>
        )}
      </div>

      {/* Recommendations header */}
      <div className="mt-12 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("project.recommended")}</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            {t("project.recommendedBadge")}
          </span>
        </div>
        <Link to="/proyectos">
          <Button variant="outline" size="sm" className="text-xs">{t("project.exploreMore")}</Button>
        </Link>
      </div>
      <p className="text-sm text-gray-500 mt-1">{t("project.recommendedSub")}</p>

      {/* Project grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full">
            <ProjectGridSkeleton count={6} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
          </div>
        )}

        {!isLoading && !hasProfile && (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
            <Compass className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-3 font-semibold text-slate-900">{t("home.noRecommendations")}</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{t("home.noRecommendationsSub")}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link to="/inversor/perfil"><Button size="sm">{t("home.completeProfileCta")}</Button></Link>
              <Link to="/proyectos"><Button size="sm" variant="outline">{t("project.exploreMore")}</Button></Link>
            </div>
          </div>
        )}

        {!isLoading && hasProfile && compatibleItems.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-3 font-semibold text-slate-900">{t("home.noMatchesYetTitle")}</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{t("home.noMatchesYetSub")}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link to="/proyectos"><Button size="sm">{t("project.exploreMore")}</Button></Link>
            </div>
          </div>
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
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              {project.cover_url && (
                <div className="aspect-video bg-gray-100">
                  <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}

              <div className="p-6 flex flex-col gap-4 flex-1">

                {/* Header: company info + match score */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <EntityAvatar src={company?.logo_url} name={company?.legal_name} kind="company" size={32} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{project.title}</h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{company?.legal_name ?? ""}</p>
                    </div>
                  </div>
                  <MatchScorePill score={match.score} label={t("project.match").toLowerCase()} />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  <EntityTypeBadge type={company?.entity_type} size="xs" />
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    <TrendingUp className="h-3 w-3" />{project.sector}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    <MapPin className="h-3 w-3" />{project.country}
                  </span>
                  <span className="inline-flex items-center bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {t(`stage.${project.stage}`)}
                  </span>
                  <span className="inline-flex items-center bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {t(`investmentType.${project.investment_type}`)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{project.description}</p>

                {/* Why match (expandable) */}
                {chips.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [project.id]: !e[project.id] }))}
                      className="text-xs text-blue-600 font-medium inline-flex items-center gap-1 hover:text-blue-800 transition-colors"
                      aria-expanded={isOpen}
                    >
                      {t("project.whyMatch")}
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {isOpen && (
                      <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">
                          {t("project.matchesLabel")}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <span key={c.key + c.label} className="inline-flex items-center gap-1 bg-white text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">
                              ✓ {c.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
                  <Link to="/proyectos/$id" params={{ id: project.id }} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs h-9">{t("project.viewProject")}</Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    aria-label={favorites.isFavorite(project.id) ? t("favorites.remove") : t("favorites.add")}
                    aria-pressed={favorites.isFavorite(project.id)}
                    onClick={() => favorites.toggle(project.id)}
                  >
                    <Heart aria-hidden className={`h-4 w-4 ${favorites.isFavorite(project.id) ? "fill-rose-500 text-rose-500" : "text-gray-400"}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    aria-label={t("project.contactCompany")}
                    onClick={() => reqMut.mutate(project.id)}
                  >
                    <Send aria-hidden className="h-4 w-4" />
                  </Button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && hasProfile && compatibleItems.length > 0 && (
        <div className="mt-10 flex justify-center">
          <Link to="/proyectos">
            <Button variant="outline" className="text-sm">{t("project.exploreMore")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
