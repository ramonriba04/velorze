import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { listAllUsers, listAllProjects, adminSetProjectStatus, adminDeleteProject } from "@/lib/admin.functions";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const { t } = useTranslation();
  const { role, loading } = useMyRole();
  const qc = useQueryClient();
  const usersFn = useServerFn(listAllUsers);
  const projectsFn = useServerFn(listAllProjects);
  const setStatus = useServerFn(adminSetProjectStatus);
  const del = useServerFn(adminDeleteProject);

  const { data: users } = useQuery({ queryKey: ["admin_users"], queryFn: () => usersFn(), enabled: role === "admin" });
  const { data: projects } = useQuery({ queryKey: ["admin_projects"], queryFn: () => projectsFn(), enabled: role === "admin" });

  if (loading) return <div className="p-10">{t("common.loading")}</div>;
  if (role !== "admin") return <div className="p-10 text-center text-muted-foreground">403 — Acceso restringido</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
      <Tabs defaultValue="users" className="mt-6">
        <TabsList>
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="projects">{t("admin.projects")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4 space-y-2">
          {users?.map((u: any) => (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{u.role ?? "—"}</p>
              </div>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="projects" className="mt-4 space-y-2">
          {projects?.map((p: any) => (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.sector} · {p.country}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{p.status}</Badge>
                <Button size="sm" variant="outline" onClick={async () => {
                  await setStatus({ data: { id: p.id, status: p.status === "published" ? "draft" : "published" } });
                  qc.invalidateQueries({ queryKey: ["admin_projects"] });
                }}>{p.status === "published" ? t("admin.unpublish") : t("admin.publish")}</Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm("¿Eliminar?")) return;
                  await del({ data: { id: p.id } });
                  qc.invalidateQueries({ queryKey: ["admin_projects"] });
                }}>{t("common.delete")}</Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
