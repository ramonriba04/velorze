import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getCompatibleInvestors } from "@/lib/matching.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/empresa/$id/inversores")({
  component: CompatibleInvestors,
});

function CompatibleInvestors() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const fn = useServerFn(getCompatibleInvestors);
  const { data } = useQuery({
    queryKey: ["compatible", id],
    queryFn: () => fn({ data: { project_id: id } }),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Inversores compatibles</h1>
      <p className="text-sm text-muted-foreground">{t("disclaimer")}</p>
      <div className="mt-6 grid gap-3">
        {data?.items.length === 0 && <p className="text-muted-foreground">{t("common.noResults")}</p>}
        {data?.items.map((i: any) => (
          <Card key={i.investor.user_id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{i.investor.profiles?.full_name ?? "Inversor"}</p>
              <p className="text-xs text-muted-foreground">{(i.investor.sectors ?? []).join(", ")}</p>
            </div>
            <Badge>{i.match.score}%</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
