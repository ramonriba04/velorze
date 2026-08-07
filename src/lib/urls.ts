export const SITE_URL = "https://capora-ai-connect.lovable.app";

/** Canonical public path for a project: slug when available, id as fallback. */
export function projectPath(project: { id: string; slug?: string | null }) {
  return project.slug ? `/project/${project.slug}` : `/proyectos/${project.id}`;
}

/** Canonical public path for a publisher profile. */
export function publisherPath(publisher: { slug?: string | null }) {
  return publisher.slug ? `/publisher/${publisher.slug}` : null;
}

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Only absolute https URLs are valid Open Graph images. */
export function ogImage(url?: string | null) {
  return url && /^https:\/\//.test(url) ? url : null;
}

export function clampText(text: string | null | undefined, max = 155) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
