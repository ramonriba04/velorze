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
import { ShieldCheck, ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { DetailSkeleton } from "@/components/ui/skeletons";



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
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("suspended_at")
        .eq("id", project.company_id)
        .maybeSingle();

      const { data: imgs } = await supabase
        .from("project_images")
        .select("url")
        .eq("project_id", id)
        .order("sort_order");
      return { ...project, company, ownerSuspended: !!ownerProfile?.suspended_at, images: imgs ?? [] } as any;
    },
  });

  const unavailable = !!data && (data.hidden_by_moderation || data.ownerSuspended);

  const images: { url: string }[] = data?.images ?? [];
  const cover = images[0]?.url ?? data?.cover_url ?? null;
  const galleryItems: { url: string }[] = images.length > 0
    ? images
    : (cover ? [{ url: cover }] : []);
  const hasMulti = galleryItems.length > 1;
  const goPrev = () => setActiveImg((i) => (i - 1 + galleryItems.length) % galleryItems.length);
  const goNext = () => setActiveImg((i) => (i + 1) % galleryItems.length);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (!hasMulti) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMulti, galleryItems.length]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-10 pb-20 md:pb-10">
        {isLoading && <DetailSkeleton />}

        {data && unavailable && (
          <Card className="p-8 text-center space-y-2">
            <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">{t("safety.projectUnavailable")}</p>
            <p className="text-sm text-muted-foreground">{t("safety.projectUnavailableSub")}</p>
          </Card>
        )}
        {data && !unavailable && (
          <Card className="p-0 overflow-hidden">
            {galleryItems.length > 0 && (
              <div className="bg-muted">
                <div
                  className="relative"
                  onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchStart.current == null) return;
                    const dx = e.changedTouches[0].clientX - touchStart.current;
                    if (Math.abs(dx) > 50) (dx < 0 ? goNext() : goPrev());
                    touchStart.current = null;
                  }}
                >
                  <img
                    src={galleryItems[activeImg]?.url ?? cover ?? ""}
                    alt={data.title}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full aspect-video object-cover transition-opacity"
                  />
                  {hasMulti && (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        aria-label={t("gallery.prev")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label={t("gallery.next")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium">
                        {activeImg + 1} / {galleryItems.length}
                      </span>
                    </>
                  )}
                </div>
                {hasMulti && (
                  <div className="flex gap-2 p-3 overflow-x-auto border-t border-border">
                    {galleryItems.map((img, i) => (
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
                {user && user.id !== data.company_id && (
                  <ReportDialog kind="project" projectId={id} />
                )}
              </div>
              
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
