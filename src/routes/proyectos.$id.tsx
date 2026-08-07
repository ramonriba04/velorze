import { createFileRoute } from "@tanstack/react-router";
import { Header, Footer } from "@/components/layout/Header";
import { ProjectDetailView } from "@/components/project/ProjectDetailView";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, clampText, ogImage } from "@/lib/urls";

export const Route = createFileRoute("/proyectos/$id")({
  loader: async ({ params }) => {
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, description, cover_url, slug, status")
      .eq("id", params.id)
      .maybeSingle();
    return { project };
  },
  head: ({ params, loaderData }) => {
    const project = loaderData?.project;
    // Canonical always points at the slug URL when one exists.
    const canonical = project?.slug
      ? `${SITE_URL}/project/${project.slug}`
      : `${SITE_URL}/proyectos/${params.id}`;
    if (!project) {
      return {
        meta: [{ title: "Proyecto | Capora" }, { name: "robots", content: "noindex" }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }
    const description = clampText(project.description);
    const image = ogImage(project.cover_url);
    return {
      meta: [
        { title: `${project.title} | Capora` },
        { name: "description", content: description },
        { property: "og:site_name", content: "Capora" },
        { property: "og:title", content: project.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 pb-20 md:pb-10">
        <ProjectDetailView id={id} />
      </main>
      <Footer />
    </div>
  );
}
