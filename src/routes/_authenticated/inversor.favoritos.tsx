import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inversor/favoritos")({
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const { data, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("project_id, projects(*)")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

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
            ctaTo="/inversor"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data?.map((f: any) => f.projects && (
            <Card key={f.project_id} className="p-5">
              <h3 className="font-semibold">{f.projects.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{f.projects.description}</p>
              <Link to="/proyectos/$id" params={{ id: f.project_id }}>
                <Button size="sm" variant="outline" className="mt-3">{t("project.viewProject")}</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

