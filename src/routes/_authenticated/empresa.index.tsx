import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/empresa/")({
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const { data } = useQuery({
    queryKey: ["my_projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("nav.projects")}</h1>
        <div className="flex gap-2">
          <Link to="/empresa/perfil"><Button variant="outline" size="sm">{t("nav.profile")}</Button></Link>
          <Link to="/empresa/solicitudes"><Button variant="outline" size="sm">{t("nav.requests")}</Button></Link>
          <Link to="/empresa/nuevo">
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />{t("nav.newProject")}</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data?.length === 0 && (
          <Card className="p-8 text-center md:col-span-2">
            <p className="text-muted-foreground">{t("project.noProjects")}</p>
            <Link to="/empresa/nuevo"><Button className="mt-4">{t("project.createFirst")}</Button></Link>
          </Card>
        )}
        {data?.map((p: any) => (
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
