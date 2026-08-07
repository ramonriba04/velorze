import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ids of users involved in a block with the current user (either direction).
 * Used to keep blocked users out of search, favorites and suggestions.
 */
export function useBlockedIds(userId?: string) {
  const { data } = useQuery({
    queryKey: ["blocked_with_me", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("blocked_with_me", { _user_id: userId! });
      const ids = ((data as any[]) ?? [])
        .map((row: any) => (typeof row === "string" ? row : row?.blocked_with_me))
        .filter(Boolean) as string[];
      return ids;
    },
  });
  return new Set<string>(data ?? []);
}
