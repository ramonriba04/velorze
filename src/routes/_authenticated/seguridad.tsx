import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { listMyBlocks, unblockUser } from "@/lib/moderation.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityTypeBadge } from "@/components/EntityTypeBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ListSkeleton } from "@/components/ui/skeletons";


export const Route = createFileRoute("/_authenticated/seguridad")({
  head: () => ({ meta: [{ title: "Seguridad | Velorze" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Safety,
});

function Safety() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyBlocks);
  const unblock = useServerFn(unblockUser);

  const { data, isLoading } = useQuery({ queryKey: ["my_blocks"], queryFn: () => listFn() });

  const removeMut = useMutation({
    mutationFn: (id: string) => unblock({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success(t("safety.block.unblocked"));
      qc.invalidateQueries({ queryKey: ["my_blocks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Link to="/ajustes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("common.back")}
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("safety.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("safety.sub")}</p>
      </header>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <ShieldOff className="h-4 w-4" />
          <h2 className="font-semibold">{t("safety.blockedUsers")}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("safety.blockedUsersHint")}</p>

        <div className="mt-4 space-y-2">
          {isLoading && <ListSkeleton count={3} />}
          {!isLoading && (data ?? []).length === 0 && (
            <EmptyState icon={<ShieldCheck />} title={t("safety.emptyTitle")} description={t("safety.emptySub")} />
          )}
          {(data ?? []).map((b: any) => (
            <div key={b.blocked_id} className="flex items-center gap-3 rounded-md border p-2.5">
              <EntityAvatar src={b.avatar_url} name={b.name} kind={b.kind as any} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  {b.entity_type && <EntityTypeBadge type={b.entity_type} size="xs" />}
                </div>
                <p className="text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">{t("safety.block.unblock")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("safety.block.unblockTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("safety.block.unblockDesc", { name: b.name })}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeMut.mutate(b.blocked_id)}>
                      {t("safety.block.unblock")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
