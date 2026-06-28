import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Props = {
  pct: number;
  complete: boolean;
  missing: string[]; // i18n keys under completeness.field.*
  ctaTo: "/empresa/perfil" | "/inversor/perfil";
  ctaCopy: string; // already translated short blurb
  compact?: boolean;
};

function statusBadge(pct: number, t: (k: string) => string) {
  if (pct >= 100) return { label: `🟢 ${t("completeness.status.complete")}`, tone: "bg-success/10 text-success" };
  if (pct >= 60)  return { label: `🟡 ${t("completeness.status.almost")}`,   tone: "bg-warning/10 text-warning" };
  return { label: `🔴 ${t("completeness.status.action")}`, tone: "bg-destructive/10 text-destructive" };
}

export function ProfileCompletenessCard({
  pct, complete, missing, ctaTo, ctaCopy, compact,
}: Props) {
  const { t } = useTranslation();
  const badge = statusBadge(pct, t);

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t("completeness.title")}{" "}
            <span className="text-muted-foreground font-normal">— {pct}%</span>
          </p>
          {!complete && !compact && (
            <p className="mt-1 text-sm text-muted-foreground">{ctaCopy}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${badge.tone}`}>
          {badge.label}
        </span>
      </div>
      <Progress value={pct} className="mt-3 h-2" />
      {!complete && missing.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {missing.map((k) => (
            <li key={k} className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
              {t(`completeness.field.${k}`)}
            </li>
          ))}
        </ul>
      )}
      {complete && (
        <div className="mt-3 flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("completeness.trust")}
        </div>
      )}
      {!complete && !compact && (
        <Link to={ctaTo}>
          <Button variant="outline" size="sm" className="mt-4 gap-1">
            {t("completeness.cta")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
    </Card>
  );
}

export function TrustBadge({ complete }: { complete: boolean }) {
  const { t } = useTranslation();
  if (!complete) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
      <CheckCircle2 className="h-3 w-3" />
      {t("completeness.trust")}
    </span>
  );
}
