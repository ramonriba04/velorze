import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toggleFavorite } from "@/lib/contact.functions";
import { useMyRole } from "@/hooks/useAuth";

/**
 * Shared favorites state with optimistic updates so the heart fills instantly,
 * never flickers, and stays consistent after a refresh.
 */
export function useFavorites() {
  const { user } = useMyRole();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const favFn = useServerFn(toggleFavorite);

  const idsQuery = useQuery({
    queryKey: ["favorites_ids", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("project_id")
        .eq("investor_id", user!.id);
      return (data ?? []).map((f) => f.project_id as string);
    },
  });

  const ids = new Set(idsQuery.data ?? []);

  const mutation = useMutation({
    mutationFn: (projectId: string) => favFn({ data: { project_id: projectId } }),
    onMutate: async (projectId: string) => {
      const key = ["favorites_ids", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key) ?? [];
      const next = previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId];
      qc.setQueryData(key, next);
      return { previous };
    },
    onError: (_e, _projectId, ctx) => {
      if (ctx?.previous) qc.setQueryData(["favorites_ids", user?.id], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites_ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorites_rich", user?.id] });
      qc.invalidateQueries({ queryKey: ["investor_counts", user?.id] });
    },
  });

  // Removing a favorite is reversible for a few seconds via the toast action.
  const toggle = (projectId: string) => {
    const wasFavorite = ids.has(projectId);
    mutation.mutate(projectId);
    if (wasFavorite) {
      toast(t("favorites.removedToast"), {
        description: t("favorites.removedToastSub"),
        duration: 6000,
        action: {
          label: t("common.undo"),
          onClick: () => mutation.mutate(projectId),
        },
      });
    } else {
      toast.success(t("favorites.addedToast"), {
        description: t("favorites.addedToastSub"),
        action: {
          label: t("common.undo"),
          onClick: () => mutation.mutate(projectId),
        },
      });
    }
  };

  return {
    ids,
    isFavorite: (projectId: string) => ids.has(projectId),
    toggle,
    isLoading: idsQuery.isLoading,
  };
}
