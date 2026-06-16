import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getCompatibleInvestors } from "@/lib/matching.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityAvatar } from "@/components/media/EntityAvatar";

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
        {data?.items.map((i: any) => {
          const name = i.investor.display_name || i.investor.profiles?.full_name || "Inversor";
          const avatar = i.investor.avatar_url || i.investor.profiles?.avatar_url;
          return (
            <Card key={i.investor.user_id} className="p-4">
              <div className="flex items-start gap-3">
                <EntityAvatar src={avatar} name={name} kind="user" size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{name}</p>
                    <Badge>{i.match.score}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{(i.investor.sectors ?? []).join(", ")}</p>
                  {i.investor.description && (
                    <p className="mt-2 text-sm line-clamp-3">{i.investor.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {(i.investor.countries ?? []).slice(0, 4).map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                    {i.match.reasons.length > 0 && (
                      <span className="text-primary">{i.match.reasons.join(" · ")}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
