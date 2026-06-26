import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { useMyRole } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { createContactRequest } from "@/lib/contact.functions";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

export const Route = createFileRoute("/proyectos/$id")({
  head: () => ({
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
  const [activeImg, setActiveImg] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (!project) return null;
      const { data: company } = await supabase
        .from("company_profiles")
        .select("legal_name, country, logo_url, description, website")
        .eq("user_id", project.company_id)
        .maybeSingle();
      const { data: imgs } = await supabase
        .from("project_images")
        .select("url")
        .eq("project_id", id)
        .order("sort_order");
      return { ...project, company, images: imgs ?? [] } as any;
    },
  });

  const images: { url: string }[] = data?.images ?? [];
  const cover = images[0]?.url ?? data?.cover_url ?? null;
  const hasGallery = images.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-10">
        {isLoading && <p>{t("common.loading")}</p>}
        {data && (
          <Card className="p-0 overflow-hidden">
            {cover && (
              <div className="bg-muted">
                <img
                  src={hasGallery ? images[activeImg].url : cover}
                  alt={data.title}
                  className="w-full aspect-video object-cover"
                />
                {hasGallery && images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto border-t border-border">
                    {images.map((img, i) => (
                      <button
                        key={img.url + i}
                        type="button"
                        onClick={() => setActiveImg(i)}
                        className={`shrink-0 h-16 w-24 rounded overflow-hidden border ${i === activeImg ? "border-primary" : "border-border"}`}
                      >
                        <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{data.sector}</Badge>
                <Badge variant="outline">{data.country}</Badge>
                <Badge variant="outline">{t(`stage.${data.stage}`)}</Badge>
                <Badge variant="outline">{t(`investmentType.${data.investment_type}`)}</Badge>
              </div>
              <h1 className="text-3xl font-bold">{data.title}</h1>
              <div className="mt-3 flex items-center gap-3">
                <EntityAvatar src={data.company?.logo_url} name={data.company?.legal_name} kind="company" size={40} />
                <div>
                  <p className="text-sm font-medium">{data.company?.legal_name ?? ""}</p>
                  {data.company?.website && (
                    <a href={data.company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                      {data.company.website}
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground">{t("project.capital")}</p><p className="font-semibold">{Number(data.capital_required).toLocaleString()}</p></div>
                {data.ticket_min && <div><p className="text-muted-foreground">{t("project.ticketMin")}</p><p className="font-semibold">{Number(data.ticket_min).toLocaleString()}</p></div>}
                {data.ticket_max && <div><p className="text-muted-foreground">{t("project.ticketMax")}</p><p className="font-semibold">{Number(data.ticket_max).toLocaleString()}</p></div>}
              </div>
              <p className="mt-6 whitespace-pre-wrap">{data.description}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {user && role === "inversor" && (
                  <Button onClick={async () => {
                    try { await reqFn({ data: { project_id: id } }); toast.success(t("project.requestSent")); }
                    catch (e) { toast.error((e as Error).message); }
                  }}>{t("project.contactCompany")}</Button>
                )}
                {!user && <Link to="/auth"><Button>{t("nav.login")}</Button></Link>}
                <ShareButton title={data.title} text={data.description?.slice(0, 140)} />
              </div>
              <p className="mt-6 text-xs text-muted-foreground border-t border-border pt-4">{t("disclaimer")}</p>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
