import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
import { blockUser } from "@/lib/moderation.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  userId: string;
  displayName?: string | null;
  trigger?: React.ReactNode;
  onBlocked?: () => void;
};

export function BlockUserDialog({ userId, displayName, trigger, onBlocked }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const block = useServerFn(blockUser);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await block({ data: { user_id: userId } });
      toast.success(t("safety.block.done"));
      setOpen(false);
      onBlocked?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <ShieldOff className="mr-1.5 h-4 w-4" />
            {t("safety.block.action")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("safety.block.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {displayName ? `${displayName} — ` : ""}{t("safety.block.desc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); onConfirm(); }}>
            {t("safety.block.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
