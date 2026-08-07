import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { respondContactRequest } from "@/lib/contact.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeletons";

import { Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/solicitudes")({
  component: CompanyRequests,
});

function CompanyRequests() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const qc = useQueryClient();
  const respond = useServerFn(respondContactRequest);

  const { data, isLoading } = useQuery({
    queryKey: ["company_requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_requests")
        .select("*, projects(title), investor:investor_id(full_name)")
        .eq("company_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: "accepted" | "rejected" }) => respond({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_requests"] }); toast.success(t("toast.requestAnswered")); },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("requests.title")}</h1>
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <ListSkeleton count={3} withAvatar={false} />
        ) : (!data || data.length === 0) ? (
          <EmptyState icon={<Inbox />} title={t("requests.empty")} description={t("empty.notificationsSub")} />

        ) : data.map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{r.projects?.title}</p>
                <p className="text-xs text-muted-foreground">{r.message ?? ""}</p>
              </div>
              <Badge variant={r.status === "accepted" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                {t(`requests.${r.status}`)}
              </Badge>
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => mut.mutate({ id: r.id, status: "accepted" })}>{t("requests.accept")}</Button>
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "rejected" })}>{t("requests.reject")}</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
