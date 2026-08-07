import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectStats = {
  project_id: string;
  views: number;
  favorites: number;
  requests: number;
  accepted: number;
  avg_score: number | null;
  last_activity: string | null;
};

/** Owner-only analytics for a set of projects (views, favorites, requests, avg match, last activity). */
export function useProjectStats(projectIds: string[]) {
  const key = [...projectIds].sort().join(",");
  return useQuery({
    queryKey: ["project_stats", key],
    enabled: projectIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all(
        projectIds.map(async (id) => {
          const { data, error } = await supabase.rpc("project_stats", { _project_id: id });
          if (error) return null;
          const row = (Array.isArray(data) ? data[0] : data) as any;
          if (!row) return null;
          return {
            project_id: id,
            views: Number(row.views ?? 0),
            favorites: Number(row.favorites ?? 0),
            requests: Number(row.requests ?? 0),
            accepted: Number(row.accepted ?? 0),
            avg_score: row.avg_score == null ? null : Number(row.avg_score),
            last_activity: row.last_activity ?? null,
          } as ProjectStats;
        }),
      );
      const map: Record<string, ProjectStats> = {};
      results.forEach((r) => {
        if (r) map[r.project_id] = r;
      });
      return map;
    },
  });
}

export function sumStats(map: Record<string, ProjectStats> | undefined) {
  const rows = Object.values(map ?? {});
  if (rows.length === 0) {
    return { views: 0, favorites: 0, requests: 0, accepted: 0, avg_score: null as number | null, last_activity: null as string | null };
  }
  const scored = rows.filter((r) => r.avg_score != null);
  const lastTimes = rows.map((r) => r.last_activity).filter(Boolean) as string[];
  return {
    views: rows.reduce((s, r) => s + r.views, 0),
    favorites: rows.reduce((s, r) => s + r.favorites, 0),
    requests: rows.reduce((s, r) => s + r.requests, 0),
    accepted: rows.reduce((s, r) => s + r.accepted, 0),
    avg_score: scored.length
      ? Math.round(scored.reduce((s, r) => s + (r.avg_score ?? 0), 0) / scored.length)
      : null,
    last_activity: lastTimes.length
      ? lastTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null,
  };
}
