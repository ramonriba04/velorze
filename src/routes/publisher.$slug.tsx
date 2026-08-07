import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { EntityTypeBadge } from "@/components/EntityTypeBadge";
import { ShareButton } from "@/components/ShareButton";
import { ProjectGridSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, ShieldCheck, Globe, MapPin, ImageOff } from "lucide-react";
import { SITE_URL, clampText, ogImage } from "@/lib/urls";

export const Route = createFileRoute("/publisher/$slug")({
  loader: async ({ params }) => {
    const { data: publisher } = await supabase
      .from("company_profiles")
      .select("user_id, legal_name, description, logo_url, country, website, entity_type, trust_level, slug")
      .eq("slug", params.slug)
      .maybeSingle();
    return { publisher };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/publisher/${params.slug}`;
    const p = loaderData?.publisher;
    if (!p) {
      return {
        meta: [{ title: "Perfil no disponible | Capora" }, { name: "robots", content: "noindex" }],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${p.legal_name} | Capora`;
    const description = clampText(
      p.description || `${p.legal_name} publica oportunidades de inversión en Capora.`,
    );
    const image = ogImage(p.logo_url);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Capora" },
        { property: "og:title", content: p.legal_name },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: p.legal_name },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: p.legal_name,
            description,
            url,
            ...(image ? { logo: image } : {}),
            ...(p.website ? { sameAs: [p.website] } : {}),
          }),
        },
      ],
    };
  },
  component: PublisherProfile,
});

function PublisherProfile() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const { publisher } = Route.useLoaderData();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["publisher_projects", publisher?.user_id],
    enabled: !!publisher?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, description, sector, country, cover_url, slug, capital_required")
        .eq("company_id", publisher!.user_id)
        .eq("status", "published")
        .eq("hidden_by_moderation", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const verified = ["basic", "trusted", "manual"].includes(publisher?.trust_level ?? "unverified");

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 pb-20 md:pb-10">
        {!publisher ? (
          <Card className="space-y-2 p-8 text-center">
            <p className="font-semibold">{t("notFound.title")}</p>
            <Link to="/proyectos" className="text-sm text-primary underline">
              {t("nav.projects")}
            </Link>
          </Card>
        ) : (
          <>
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start gap-4">
                <EntityAvatar
                  src={publisher.logo_url}
                  name={publisher.legal_name}
                  kind="company"
                  size={64}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold sm:text-3xl">{publisher.legal_name}</h1>
                    {verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                        <ShieldCheck aria-hidden className="h-3 w-3" />
                        {publisher.trust_level === "basic"
                          ? t("trust.verifiedBadge")
                          : t("verification.trustTrusted")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <EntityTypeBadge type={publisher.entity_type} />
                    {publisher.country && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden className="h-3 w-3" />
                        {publisher.country}
                      </span>
                    )}
                    {publisher.website && (
                      <a
                        href={publisher.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        <Globe aria-hidden className="h-3 w-3" />
                        {publisher.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
                <ShareButton
                  title={publisher.legal_name}
                  text={clampText(publisher.description, 140)}
                  url={`${SITE_URL}/publisher/${slug}`}
                />
              </div>
              {publisher.description && (
                <p className="mt-5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {publisher.description}
                </p>
              )}
            </Card>

            <h2 className="mt-10 text-xl font-semibold">{t("publisher.projects")}</h2>
            <div className="mt-4">
              {isLoading && <ProjectGridSkeleton count={3} />}
              {!isLoading && (projects ?? []).length === 0 && (
                <EmptyState
                  icon={<Briefcase />}
                  title={t("publisher.noProjects")}
                  description={t("publisher.noProjectsSub")}
                />
              )}
              {!isLoading && (projects ?? []).length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(projects ?? []).map((p) => (
                    <Link
                      key={p.id}
                      to={p.slug ? "/project/$slug" : "/proyectos/$id"}
                      params={p.slug ? ({ slug: p.slug } as any) : ({ id: p.id } as any)}
                      className="block"
                    >
                      <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-elegant">
                        <div className="flex aspect-[16/9] items-center justify-center bg-muted">
                          {p.cover_url ? (
                            <img
                              src={p.cover_url}
                              alt={p.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff aria-hidden className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-2 p-4">
                          <p className="truncate font-medium">{p.title}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {p.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline">{p.sector}</Badge>
                            <Badge variant="outline">{p.country}</Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
