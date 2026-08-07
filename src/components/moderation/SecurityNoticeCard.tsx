import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import type { SecurityPatternHit } from "@/lib/security-patterns";
import { Button } from "@/components/ui/button";
import { BlockUserDialog } from "./BlockUserDialog";
import { ReportDialog } from "./ReportDialog";

type Props = {
  hits: SecurityPatternHit[];
  senderId: string;
  senderName?: string | null;
  onBlocked?: () => void;
};

export function SecurityNoticeCard({ hits, senderId, senderName, onBlocked }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || hits.length === 0) return null;

  return (
    <div className="my-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">🛡️ {t("safety.notice.title")}</p>
          <p className="mt-1 text-xs leading-relaxed">{t("safety.notice.body1")}</p>
          <p className="mt-1 text-xs leading-relaxed">{t("safety.notice.body2")}</p>
          <p className="mt-1 text-xs leading-relaxed">{t("safety.notice.body3")}</p>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {hits.map((h) => (
              <span
                key={h.kind}
                className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-medium dark:bg-amber-500/30"
              >
                {h.label}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ReportDialog
              kind="user"
              userId={senderId}
              displayName={senderName}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  {t("safety.report.userAction")}
                </Button>
              }
            />
            <BlockUserDialog
              userId={senderId}
              displayName={senderName}
              onBlocked={onBlocked}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  {t("safety.block.action")}
                </Button>
              }
            />
            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
              <Link to="/ayuda">{t("safety.notice.learnMore")}</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs ml-auto"
              onClick={() => setDismissed(true)}
            >
              {t("safety.notice.dismiss")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
