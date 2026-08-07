import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { useBlockedIds } from "@/hooks/useBlockedIds";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { Heart, ImageOff } from "lucide-react";
import { computeMatch, type MatchableInvestor, type MatchableProject } from "@/lib/matching";

export const Route = createFileRoute("/_authenticated/inversor/favoritos")({
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const { user } = useMyRole();

  const blockedIds = useBlockedIds(user?.id);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["favorites_rich", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: favs } = await supabase
        .from("favorites")
        .select("project_id, projects(*)")
        .eq("investor_id", user!.id);
      const rows = (favs ?? []).filter((f: any) => f.projects);
      if (rows.length === 0) return [];

      const companyIds = Array.from(new Set(rows.map((r: any) => r.projects.company_id)));
      const projectIds = rows.map((r: any) => r.projects.id);

      const [{ data: companies }, { data: images }, { data: investor }] = await Promise.all([
        supabase
          .from("company_profiles")
          .select("user_id, legal_name, logo_url, entity_type")
          .in("user_id", companyIds),
        supabase
          .from("project_images")
          .select("project_id, url, sort_order")
          .in("project_id", projectIds)
          .order("sort_order"),
        supabase.from("investor_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);

      const cMap: Record<string, any> = {};
      (companies ?? []).forEach((c: any) => (cMap[c.user_id] = c));
      const imgMap: Record<string, string> = {};
      (images ?? []).forEach((i: any) => { if (!imgMap[i.project_id]) imgMap[i.project_id] = i.url; });

      return rows.map((r: any) => {
        const p = r.projects;
        const company = cMap[p.company_id] ?? null;
        const thumb = imgMap[p.id] ?? p.cover_url ?? null;
        const match = investor
          ? computeMatch(p as MatchableProject, investor as MatchableInvestor)
          : null;
        return { project: p, company, thumb, match };
      });
    },
  });

  const data = (rawData ?? []).filter((r: any) => !blockedIds.has(r.project.company_id));


  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-28">
      <h1 className="text-3xl font-bold">{t("favorites.title")}</h1>

      {!isLoading && (!data || data.length === 0) ? (
        <div className="mt-6">
          <EmptyState
            icon={<Heart />}
            title={t("empty.favorites")}
            description={t("empty.favoritesSub")}
            ctaLabel={t("empty.exploreCta")}
            ctaTo="/proyectos"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data?.map(({ project, company, thumb, match }: any) => (
            <Link
              key={project.id}
              to="/proyectos/$id"
              params={{ id: project.id }}
              className="block group"
            >
              <Card className="overflow-hidden transition hover:border-primary">
                <div className="aspect-[16/9] w-full bg-muted relative">
                  {thumb ? (
                    <img src={thumb} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                  {match && (
                    <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                      {match.score}%
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-primary">{project.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <EntityAvatar
                      src={company?.logo_url}
                      name={company?.legal_name}
                      kind="company"
                      size={28}
                    />
                    <p className="text-sm text-muted-foreground truncate">
                      {company?.legal_name ?? "—"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
