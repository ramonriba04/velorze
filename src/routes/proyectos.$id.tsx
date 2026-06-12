import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyRole } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { createContactRequest } from "@/lib/contact.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/proyectos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Proyecto — Capora` },
      { name: "description", content: "Detalle de proyecto de inversión en Capora." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const reqFn = useServerFn(createContactRequest);

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, company:company_profiles!company_profiles_user_id_fkey(legal_name, country)").eq("id", id).maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-10">
        {isLoading && <p>{t("common.loading")}</p>}
        {data && (
          <Card className="p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">{data.sector}</Badge>
              <Badge variant="outline">{data.country}</Badge>
              <Badge variant="outline">{t(`stage.${data.stage}`)}</Badge>
              <Badge variant="outline">{t(`investmentType.${data.investment_type}`)}</Badge>
            </div>
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {(data as any).company?.legal_name ?? ""}
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">{t("project.capital")}</p><p className="font-semibold">{Number(data.capital_required).toLocaleString()}</p></div>
              {data.ticket_min && <div><p className="text-muted-foreground">{t("project.ticketMin")}</p><p className="font-semibold">{Number(data.ticket_min).toLocaleString()}</p></div>}
              {data.ticket_max && <div><p className="text-muted-foreground">{t("project.ticketMax")}</p><p className="font-semibold">{Number(data.ticket_max).toLocaleString()}</p></div>}
            </div>
            <p className="mt-6 whitespace-pre-wrap">{data.description}</p>
            <div className="mt-8 flex gap-2">
              {user && role === "inversor" && (
                <Button onClick={async () => {
                  try { await reqFn({ data: { project_id: id } }); toast.success(t("project.requestSent")); }
                  catch (e) { toast.error((e as Error).message); }
                }}>{t("project.contactCompany")}</Button>
              )}
              {!user && <Link to="/auth"><Button>{t("nav.login")}</Button></Link>}
            </div>
            <p className="mt-6 text-xs text-muted-foreground border-t border-border pt-4">{t("disclaimer")}</p>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
