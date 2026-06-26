import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Props = { children?: React.ReactNode; defaultOpen?: boolean };

export function UpgradeDialog({ children, defaultOpen }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="default" className="gap-1">
            <Sparkles className="h-4 w-4" /> {t("plans.upgrade")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("upgrade.title")}
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <span className="block">{t("upgrade.desc1")}</span>
            <span className="block">{t("upgrade.desc2")}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Link to="/planes" onClick={() => setOpen(false)}>
            <Button variant="outline">{t("upgrade.viewPlans")}</Button>
          </Link>
          <Button onClick={() => setOpen(false)}>{t("upgrade.gotIt")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
