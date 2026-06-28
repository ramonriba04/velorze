import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { deleteMyAccount } from "@/lib/account.functions";
import { useMyPlan } from "@/hooks/usePlan";
import { PlanBadge } from "@/components/PlanBadge";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ajustes")({
  component: Settings,
});

function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useMyRole();
  const removeAccount = useServerFn(deleteMyAccount);
  const { code: planCode, plan, billingStatus } = useMyPlan();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/app` },
      );
      if (error) throw error;
      toast.success(t("settings.emailChangeSent"));
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message ?? t("common.error"));
    } finally {
      setEmailLoading(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error(t("reset.tooShort"));
    if (password !== confirm) return toast.error(t("reset.mismatch"));
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("settings.passwordUpdated"));
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err.message ?? t("common.error"));
    } finally {
      setPwLoading(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await removeAccount({ data: undefined as any });
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message ?? t("common.error"));
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.sub")}</p>
      </header>

      <Card className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("plans.currentPlan")}</h2>
          <PlanBadge code={planCode} />
        </div>
        <p className="text-sm text-muted-foreground">
          {t(`plans.descriptions.${planCode}`)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("plans.billingStatus")}: <span className="font-medium text-foreground">{t(`plans.status.${billingStatus}`)}</span>
          {plan.price_cents > 0 && (
            <> · {new Intl.NumberFormat(undefined, { style: "currency", currency: plan.currency }).format(plan.price_cents / 100)}/mo</>
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/planes">
            <Button variant="outline" size="sm">{t("upgrade.viewPlans")}</Button>
          </Link>
          <UpgradeDialog />
        </div>

      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t("settings.account")}</h2>
        <div className="space-y-1">
          <Label>{t("auth.email")}</Label>
          <Input value={user?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">{t("settings.emailHint")}</p>
        </div>
        <div className="space-y-1">
          <Label>{t("settings.language")}</Label>
          <Select value={i18n.resolvedLanguage ?? "es"} onValueChange={(v) => i18n.changeLanguage(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t("settings.password")}</h2>
        <form className="space-y-3" onSubmit={updatePassword}>
          <div className="space-y-1">
            <Label htmlFor="new-password">{t("reset.newPassword")}</Label>
            <Input
              id="new-password" type="password" autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">{t("reset.confirmPassword")}</Label>
            <Input
              id="confirm-password" type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6}
            />
          </div>
          <Button type="submit" disabled={pwLoading}>
            {pwLoading ? t("common.loading") : t("reset.update")}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 border-destructive/40 p-6">
        <h2 className="text-lg font-semibold text-destructive">{t("settings.dangerZone")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.deleteDesc")}</p>
        <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteText(""); }}>
          <DialogTrigger asChild>
            <Button variant="destructive">{t("settings.deleteAccount")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.deleteTitle")}</DialogTitle>
              <DialogDescription>{t("settings.deleteConfirm")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">{t("settings.typeToConfirm", { word: t("settings.deleteWord") })}</Label>
              <Input
                id="delete-confirm" value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)} placeholder={t("settings.deleteWord")}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleting || deleteText !== t("settings.deleteWord")}
              >
                {deleting ? t("common.loading") : t("settings.deleteAccount")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">{t("footer.legal")}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/privacidad" className="text-primary hover:underline">{t("footer.privacy")}</Link>
          <Link to="/terminos" className="text-primary hover:underline">{t("footer.terms")}</Link>
          <Link to="/cookies" className="text-primary hover:underline">{t("footer.cookies")}</Link>
          <Link to="/contacto" className="text-primary hover:underline">{t("footer.contact")}</Link>
        </div>
      </Card>

      <div className="text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">← {t("common.back")}</Link>
      </div>

    </div>
  );
}
