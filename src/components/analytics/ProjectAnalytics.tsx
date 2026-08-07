import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Eye, Heart, Send, Gauge, Clock, Lock } from "lucide-react";
import { useProjectStats, sumStats } from "@/hooks/useProjectStats";
import { useMyPlan } from "@/hooks/usePlan";
import { UpgradeDialog } from "@/components/UpgradeDialog";

function Metric({
  icon,
  label,
  value,
  locked = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <Card className={`p-4 ${locked ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
    </Card>
  );
}

/**
 * Project analytics summary. Views + average compatibility stay behind the
 * advanced analytics plan feature; the rest is available on every plan.
 */
export function ProjectAnalytics({ projectIds }: { projectIds: string[] }) {
  const { t } = useTranslation();
  const { features } = useMyPlan();
  const { data, isLoading } = useProjectStats(projectIds);
  const totals = sumStats(data);
  const advanced = features.advanced_analytics;

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—";

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric
          icon={advanced ? <Eye aria-hidden className="h-4 w-4" /> : <Lock aria-hidden className="h-4 w-4" />}
          label={t("plans.metric.views")}
          value={advanced ? (isLoading ? "…" : totals.views) : t("plans.locked")}
          locked={!advanced}
        />
        <Metric
          icon={<Heart aria-hidden className="h-4 w-4" />}
          label={t("plans.metric.favorites")}
          value={isLoading ? "…" : totals.favorites}
        />
        <Metric
          icon={<Send aria-hidden className="h-4 w-4" />}
          label={t("plans.metric.requests")}
          value={isLoading ? "…" : totals.requests}
        />
        <Metric
          icon={advanced ? <Gauge aria-hidden className="h-4 w-4" /> : <Lock aria-hidden className="h-4 w-4" />}
          label={t("analytics.avgMatch")}
          value={
            advanced
              ? isLoading
                ? "…"
                : totals.avg_score == null
                  ? "—"
                  : `${totals.avg_score}%`
              : t("plans.locked")
          }
          locked={!advanced}
        />
        <Metric
          icon={<Clock aria-hidden className="h-4 w-4" />}
          label={t("analytics.lastActivity")}
          value={<span className="text-base font-semibold">{fmtDate(totals.last_activity)}</span>}
        />
      </div>
      {!advanced && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">{t("analytics.lockedHint")}</p>
          <UpgradeDialog />
        </div>
      )}
    </>
  );
}

/** Compact per-project stats row used inside project cards. */
export function ProjectStatsInline({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { features } = useMyPlan();
  const { data } = useProjectStats([projectId]);
  const s = data?.[projectId];
  if (!s) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {features.advanced_analytics && (
        <span className="inline-flex items-center gap-1" title={t("plans.metric.views")}>
          <Eye aria-hidden className="h-3.5 w-3.5" />
          {s.views}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title={t("plans.metric.favorites")}>
        <Heart aria-hidden className="h-3.5 w-3.5" />
        {s.favorites}
      </span>
      <span className="inline-flex items-center gap-1" title={t("plans.metric.requests")}>
        <Send aria-hidden className="h-3.5 w-3.5" />
        {s.requests}
      </span>
      {features.advanced_analytics && s.avg_score != null && (
        <span className="inline-flex items-center gap-1" title={t("analytics.avgMatch")}>
          <Gauge aria-hidden className="h-3.5 w-3.5" />
          {s.avg_score}%
        </span>
      )}
    </div>
  );
}
