import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
import { ShieldCheck, ShieldOff, Heart } from "lucide-react";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { DetailSkeleton } from "@/components/ui/skeletons";
import { ProjectGallery } from "@/components/project/ProjectGallery";
import { useFavorites } from "@/hooks/useFavorite";
import { SITE_URL, projectPath } from "@/lib/urls";

export function useProjectDetail({ id, slug }: { id?: string; slug?: string }) {
  return useQuery({
    queryKey: ["project_detail", id ?? null, slug ?? null],
    enabled: !!(id || slug),
    queryFn: async () => {
      let query = supabase.from("projects").select("*");
      query = id ? query.eq("id", id) : query.eq("slug", slug!);
      const { data: project } = await query.maybeSingle();
      if (!project) return null;

      const [{ data: company }, { data: ownerProfile }, { data: imgs }] = await Promise.all([
        supabase
          .from("company_profiles")
          .select(
            "legal_name, country, logo_url, description, website, entity_type, verification_status, trust_level, slug",
          )
          .eq("user_id", project.company_id)
          .maybeSingle(),
        supabase.from("profiles").select("suspended_at").eq("id", project.company_id).maybeSingle(),
        supabase.from("project_images").select("url").eq("project_id", project.id).order("sort_order"),
      ]);

      return {
        ...project,
        company,
        ownerSuspended: !!ownerProfile?.suspended_at,
        images: imgs ?? [],
      } as any;
    },
  });
}

export function ProjectDetailView({ id, slug }: { id?: string; slug?: string }) {
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const reqFn = useServerFn(createContactRequest);
  const { data, isLoading } = useProjectDetail({ id, slug });
  const favorites = useFavorites();

  const projectId: string | undefined = data?.id;
  const unavailable = !!data && (data.hidden_by_moderation || data.ownerSuspended);

  // Count one view per project per browser session.
  useEffect(() => {
    if (!projectId || unavailable || data?.status !== "published") return;
    if (data?.company_id && user?.id === data.company_id) return;
    const key = `capora:viewed:${projectId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable — still record the view */
    }
    supabase
      .from("project_views")
      .insert({ project_id: projectId, viewer_id: user?.id ?? null })
      .then(() => {}, () => {});
  }, [projectId, unavailable, data?.status, data?.company_id, user?.id]);

  const images: { url: string }[] = data?.images ?? [];
  const cover = images[0]?.url ?? data?.cover_url ?? null;
  const galleryItems = images.length > 0 ? images : cover ? [{ url: cover }] : [];

  if (isLoading) return <DetailSkeleton />;

  if (data && unavailable) {
    return (
      <Card className="space-y-2 p-8 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="font-semibold">{t("safety.projectUnavailable")}</p>
        <p className="text-sm text-muted-foreground">{t("safety.projectUnavailableSub")}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="space-y-2 p-8 text-center">
        <p className="font-semibold">{t("notFound.title")}</p>
        <Link to="/proyectos" className="text-sm text-primary underline">
          {t("nav.projects")}
        </Link>
      </Card>
    );
  }

  const shareUrl = `${SITE_URL}${projectPath(data)}`;
  const isFav = projectId ? favorites.isFavorite(projectId) : false;

  return (
    <Card className="overflow-hidden p-0">
      {galleryItems.length > 0 && (
        <ProjectGallery images={galleryItems} alt={data.title} priority />
      )}
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <EntityTypeBadge type={data.company?.entity_type} />
          <Badge variant="outline">{data.sector}</Badge>
          <Badge variant="outline">{data.country}</Badge>
          <Badge variant="outline">{t(`stage.${data.stage}`)}</Badge>
          <Badge variant="outline">{t(`investmentType.${data.investment_type}`)}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{data.title}</h1>
        <div className="mt-3 flex items-center gap-3">
          <EntityAvatar
            src={data.company?.logo_url}
            name={data.company?.legal_name}
            kind="company"
            size={40}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {data.company?.slug ? (
                <Link
                  to="/publisher/$slug"
                  params={{ slug: data.company.slug }}
                  className="truncate text-sm font-medium hover:text-primary"
                >
                  {data.company?.legal_name ?? ""}
                </Link>
              ) : (
                <p className="truncate text-sm font-medium">{data.company?.legal_name ?? ""}</p>
              )}
              {(["basic", "trusted", "manual"] as const).includes(
                (data.company?.trust_level ?? "unverified") as "basic" | "trusted" | "manual",
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
              <a
                href={data.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {data.company.website}
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">{t("project.capital")}</p>
            <p className="font-semibold">{Number(data.capital_required).toLocaleString()}</p>
          </div>
          {data.ticket_min && (
            <div>
              <p className="text-muted-foreground">{t("project.ticketMin")}</p>
              <p className="font-semibold">{Number(data.ticket_min).toLocaleString()}</p>
            </div>
          )}
          {data.ticket_max && (
            <div>
              <p className="text-muted-foreground">{t("project.ticketMax")}</p>
              <p className="font-semibold">{Number(data.ticket_max).toLocaleString()}</p>
            </div>
          )}
        </div>
        <p className="mt-6 whitespace-pre-wrap">{data.description}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {user && role === "inversor" && (
            <Button
              onClick={async () => {
                try {
                  await reqFn({ data: { project_id: data.id } });
                  toast.success(t("project.requestSent"));
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {t("project.contactCompany")}
            </Button>
          )}
          {user && role === "inversor" && projectId && (
            <Button
              variant="outline"
              aria-pressed={isFav}
              aria-label={isFav ? t("favorites.remove") : t("favorites.add")}
              onClick={() => favorites.toggle(projectId)}
            >
              <Heart
                aria-hidden
                className={`mr-2 h-4 w-4 ${isFav ? "fill-current text-primary" : ""}`}
              />
              {isFav ? t("favorites.saved") : t("favorites.save")}
            </Button>
          )}
          {!user && (
            <Link to="/auth">
              <Button>{t("nav.login")}</Button>
            </Link>
          )}
          <ShareButton
            title={data.title}
            text={data.description?.slice(0, 140)}
            url={shareUrl}
          />
          {user && user.id !== data.company_id && (
            <ReportDialog kind="project" projectId={data.id} />
          )}
        </div>
      </div>
    </Card>
  );
}
