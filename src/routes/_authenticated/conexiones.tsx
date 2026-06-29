import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listConnections,
  updateConnectionStatus,
} from "@/lib/discovery.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/conexiones")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { t } = useTranslation();
  const fetcher = useServerFn(listConnections);
  const updFn = useServerFn(updateConnectionStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetcher(),
  });

  const upd = useMutation({
    mutationFn: (input: { id: string; status: "pendiente" | "conectado" | "descartado" }) =>
      updFn({ data: input }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const items = data?.items ?? [];
  const buckets = {
    pendiente: items.filter((c: any) => c.status === "pendiente"),
    conectado: items.filter((c: any) => c.status === "conectado"),
    descartado: items.filter((c: any) => c.status === "descartado"),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <header className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("connections.title")}
        </h1>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">{t("connections.sub")}</p>

      <Tabs defaultValue="conectado" className="mt-6">
        <TabsList>
          <TabsTrigger value="conectado">
            {t("connections.connected")} ({buckets.conectado.length})
          </TabsTrigger>
          <TabsTrigger value="pendiente">
            {t("connections.pending")} ({buckets.pendiente.length})
          </TabsTrigger>
          <TabsTrigger value="descartado">
            {t("connections.discarded")} ({buckets.descartado.length})
          </TabsTrigger>
        </TabsList>

        {(["conectado", "pendiente", "descartado"] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : buckets[key].length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title={t("connections.emptyTitle")}
                description={t("connections.emptySub")}
              />
            ) : (
              buckets[key].map((c: any) => (
                <ConnectionRow key={c.id} c={c} onUpdate={(s) => upd.mutate({ id: c.id, status: s })} t={t} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ConnectionRow({
  c,
  onUpdate,
  t,
}: {
  c: any;
  onUpdate: (s: "conectado" | "descartado") => void;
  t: (k: string) => string;
}) {
  const isInvestor = c.me_role === "investor";
  const other = isInvestor
    ? { name: c.company?.legal_name ?? c.otherProfile?.full_name ?? "—", avatar: c.company?.logo_url ?? c.otherProfile?.avatar_url }
    : { name: c.investor?.display_name ?? c.otherProfile?.full_name ?? "—", avatar: c.investor?.avatar_url ?? c.otherProfile?.avatar_url };

  return (
    <Card className="flex items-center gap-3 p-4">
      <EntityAvatar src={other.avatar} name={other.name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{other.name}</h3>
          <Badge variant={c.status === "conectado" ? "default" : "secondary"} className="text-xs">
            {t(`connections.status.${c.status}`)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(c.updated_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        {c.status === "conectado" && (
          <Link to="/mensajes">
            <Button size="sm" variant="outline">
              <MessageCircle className="mr-1 h-4 w-4" />
              {t("connections.openChat")}
            </Button>
          </Link>
        )}
        {c.status !== "descartado" && (
          <Button size="sm" variant="ghost" onClick={() => onUpdate("descartado")}>
            {t("connections.discard")}
          </Button>
        )}
      </div>
    </Card>
  );
}
