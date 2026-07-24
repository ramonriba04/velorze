import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { reportUser, reportProject } from "@/lib/moderation.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup, RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type UserProps = {
  kind: "user";
  userId: string;
  displayName?: string | null;
  trigger?: React.ReactNode;
};
type ProjectProps = {
  kind: "project";
  projectId: string;
  trigger?: React.ReactNode;
};
type Props = UserProps | ProjectProps;

const USER_REASONS = [
  "fraud",
  "payment_request",
  "impersonation",
  "spam",
  "inappropriate",
  "false_info",
  "other",
] as const;

const PROJECT_REASONS = [
  "false_info",
  "misleading",
  "spam",
  "inappropriate",
  "other",
] as const;

export function ReportDialog(props: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const reportU = useServerFn(reportUser);
  const reportP = useServerFn(reportProject);

  const reasons = props.kind === "user" ? USER_REASONS : PROJECT_REASONS;
  const reasonKeys = props.kind === "user" ? "safety.report.userReasons" : "safety.report.projectReasons";

  const submit = async () => {
    if (!reason) return;
    if (reason === "other" && details.trim().length < 3) {
      toast.error(t("safety.report.detailsRequired"));
      return;
    }
    setBusy(true);
    try {
      const payload = { reason, details: details.trim() || null } as any;
      if (props.kind === "user") {
        await reportU({ data: { ...payload, user_id: props.userId } });
      } else {
        await reportP({ data: { ...payload, project_id: props.projectId } });
      }
      toast.success(t("safety.report.doneTitle"), { description: t("safety.report.doneBody") });
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.trigger ?? (
          <Button variant="outline" size="sm">
            <Flag className="mr-1.5 h-4 w-4" />
            {props.kind === "user" ? t("safety.report.userAction") : t("safety.report.projectAction")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {props.kind === "user" ? t("safety.report.userTitle") : t("safety.report.projectTitle")}
          </DialogTitle>
          <DialogDescription>{t("safety.report.pickReason")}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {reasons.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-md border p-2">
              <RadioGroupItem id={`r-${r}`} value={r} />
              <Label htmlFor={`r-${r}`} className="text-sm cursor-pointer">
                {t(`${reasonKeys}.${r}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {reason === "other" && (
          <div className="space-y-1">
            <Label htmlFor="rd">{t("safety.report.detailsLabel")}</Label>
            <Textarea
              id="rd"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t("safety.report.detailsPh")}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !reason}>
            {busy ? t("common.loading") : t("safety.report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
