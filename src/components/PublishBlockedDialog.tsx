import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missing: string[]; // i18n keys under completeness.field.*
  to: "/empresa/perfil" | "/inversor/perfil";
};

export function PublishBlockedDialog({ open, onOpenChange, missing, to }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("publishBlocked.title")}</DialogTitle>
          <DialogDescription>{t("publishBlocked.body")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {missing.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              {t(`completeness.field.${k}`)}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Link to={to} onClick={() => onOpenChange(false)}>
            <Button>{t("publishBlocked.goToProfile")}</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
