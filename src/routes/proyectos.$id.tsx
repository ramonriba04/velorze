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
import { EntityTypeBadge } from "@/components/EntityTypeBadge";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";


export const Route = createFileRoute("/proyectos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Proyecto | Capora` },
      { name: "description", content: "Detalle de proyecto de inversión publicado en Capora." },
      { property: "og:title", content: "Proyecto en Capora" },
      { property: "og:description", content: "Detalle de proyecto de inversión publicado en Capora." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://capora-ai-connect.lovable.app/proyectos/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `https://capora-ai-connect.lovable.app/proyectos/${params.id}` }],
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
        .select("legal_name, country, logo_url, description, website, entity_type, verification_status, trust_level")
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
                <EntityTypeBadge type={data.company?.entity_type} />
                <Badge variant="outline">{data.sector}</Badge>
                <Badge variant="outline">{data.country}</Badge>
                <Badge variant="outline">{t(`stage.${data.stage}`)}</Badge>
                <Badge variant="outline">{t(`investmentType.${data.investment_type}`)}</Badge>
              </div>
              <h1 className="text-3xl font-bold">{data.title}</h1>
              <div className="mt-3 flex items-center gap-3">
                <EntityAvatar src={data.company?.logo_url} name={data.company?.legal_name} kind="company" size={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{data.company?.legal_name ?? ""}</p>
                    {(["basic","trusted","manual"] as const).includes(
                      (data.company?.trust_level ?? "unverified") as "basic"|"trusted"|"manual",
                    ) && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                        title={t("trust.verifiedTitle")}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {data.company?.trust_level === "trusted" || data.company?.trust_level === "manual"
                          ? t("verification.trustTrusted")
                          : t("trust.verifiedBadge")}
                      </span>
                    )}
                  </div>
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
              
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
