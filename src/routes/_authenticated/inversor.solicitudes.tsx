import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { respondContactRequest } from "@/lib/contact.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/inversor/solicitudes")({
  component: InvestorRequests,
});

function InvestorRequests() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const { data } = useQuery({
    queryKey: ["my_requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_requests")
        .select("*, projects(title)")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("requests.title")}</h1>
      <div className="mt-6 space-y-3">
        {data?.length === 0 && <p className="text-muted-foreground">{t("requests.empty")}</p>}
        {data?.map((r: any) => (
          <Card key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{r.projects?.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <Badge variant={r.status === "accepted" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
              {t(`requests.${r.status}`)}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
