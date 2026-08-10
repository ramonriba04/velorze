import { createFileRoute } from "@tanstack/react-router";
import { Header, Footer } from "@/components/layout/Header";
import { ProjectDetailView } from "@/components/project/ProjectDetailView";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, clampText, ogImage } from "@/lib/urls";

export const Route = createFileRoute("/project/$slug")({
  loader: async ({ params }) => {
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, description, cover_url, slug, company_id, status")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!project) return { project: null, publisherName: null as string | null };
    const { data: company } = await supabase
      .from("company_profiles")
      .select("legal_name")
      .eq("user_id", project.company_id)
      .maybeSingle();
    return { project, publisherName: company?.legal_name ?? null };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/project/${params.slug}`;
    const project = loaderData?.project;
    if (!project) {
      return {
        meta: [
          { title: "Proyecto no disponible | Velorze" },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const publisher = loaderData?.publisherName;
    const title = `${project.title} | Velorze`;
    const description = clampText(
      publisher
        ? `${clampText(project.description, 110)} — ${publisher} en Velorze.`
        : project.description,
    );
    const image = ogImage(project.cover_url);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Velorze" },
        { property: "og:title", content: project.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: project.title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
        ...(project.status === "published" ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: project.title,
            description,
            url,
            ...(image ? { image } : {}),
            ...(publisher ? { author: { "@type": "Organization", name: publisher } } : {}),
            publisher: { "@type": "Organization", name: "Velorze" },
          }),
        },
      ],
    };
  },
  component: ProjectBySlug,
});

function ProjectBySlug() {
  const { slug } = Route.useParams();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 pb-20 md:pb-10">
        <ProjectDetailView slug={slug} />
      </main>
      <Footer />
    </div>
  );
}
