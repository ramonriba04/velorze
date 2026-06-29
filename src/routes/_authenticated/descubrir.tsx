import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Compass, MapPin, Sparkles, X, Check, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getDiscoveryFeed,
  recordDiscoveryDecision,
} from "@/lib/discovery.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/descubrir")({
  component: DiscoveryPage,
});

function scoreColor(s: number) {
  if (s >= 90) return "bg-success text-success-foreground";
  if (s >= 70) return "bg-primary text-primary-foreground";
  if (s >= 50) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function DiscoveryPage() {
  const { t } = useTranslation();
  const feedFn = useServerFn(getDiscoveryFeed);
  const decideFn = useServerFn(recordDiscoveryDecision);
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["discovery_feed"],
    queryFn: () => feedFn(),
  });

  const mut = useMutation({
    mutationFn: (input: {
      target_user_id: string;
      project_id: string | null;
      decision: "interested" | "skipped";
    }) => decideFn({ data: input }),
    onSuccess: (r) => {
      if (r.matched) {
        toast.success(t("discovery.matchToast"));
        qc.invalidateQueries({ queryKey: ["connections"] });
      }
      setIndex((i) => i + 1);
    },
    onError: (e) => {
      const msg = (e as Error).message;
      if (msg === "daily_cap_reached") toast.error(t("discovery.capReached"));
      else toast.error(msg);
    },
  });

  const items = data?.items ?? [];
  const current = items[index];
  const used = data?.used ?? 0;
  const cap = data?.cap ?? 20;
  const pct = Math.min(100, Math.round((used / cap) * 100));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("discovery.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("discovery.sub")}
          </p>
        </div>
        <Link to="/conexiones">
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            {t("discovery.connections")}
          </Button>
        </Link>
      </header>

      <Card className="mt-4 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("discovery.dailyLimit")}</span>
          <span>
            {used} / {cap}
          </span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </Card>

      <div className="mt-6">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : !current ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={t("discovery.emptyTitle")}
            description={t("discovery.emptySub")}
            ctaLabel={t("discovery.connections")}
            ctaTo="/conexiones"
          />
        ) : current.kind === "project" ? (
          <ProjectCard
            item={current}
            disabled={mut.isPending}
            onDecide={(decision) =>
              mut.mutate({
                target_user_id: current.project.company_id,
                project_id: current.project.id,
                decision,
              })
            }
            t={t}
          />
        ) : (
          <InvestorCard
            item={current}
            disabled={mut.isPending}
            onDecide={(decision) =>
              mut.mutate({
                target_user_id: current.investor.user_id,
                project_id: null,
                decision,
              })
            }
            t={t}
          />
        )}
      </div>

      {current && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {index + 1} / {items.length}
        </p>
      )}
    </div>
  );
}

function ProjectCard({
  item,
  onDecide,
  disabled,
  t,
}: {
  item: any;
  onDecide: (d: "interested" | "skipped") => void;
  disabled: boolean;
  t: (k: string) => string;
}) {
  const p = item.project;
  const chips = item.match?.chips ?? [];
  return (
    <Card className="overflow-hidden">
      {p.cover_url ? (
        <div className="aspect-[16/9] w-full bg-muted">
          <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full gradient-primary opacity-80" />
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{p.title}</h2>
          <Badge className={scoreColor(item.match.score)}>{item.match.score}%</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-4">{p.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{p.sector}</Badge>
          <Badge variant="outline">{t(`stage.${p.stage}`)}</Badge>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {p.country}
          </span>
        </div>
        {chips.length > 0 && (
          <div className="rounded-md border bg-primary/5 p-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("project.matchesLabel")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {chips.map((c: any) => (
                <Badge key={c.key + c.label} variant="secondary" className="text-xs">
                  ✓ {c.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={disabled}
            onClick={() => onDecide("skipped")}
          >
            <X className="mr-2 h-4 w-4" />
            {t("discovery.skip")}
          </Button>
          <Button
            className="flex-1"
            disabled={disabled}
            onClick={() => onDecide("interested")}
          >
            <Check className="mr-2 h-4 w-4" />
            {t("discovery.interested")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function InvestorCard({
  item,
  onDecide,
  disabled,
  t,
}: {
  item: any;
  onDecide: (d: "interested" | "skipped") => void;
  disabled: boolean;
  t: (k: string) => string;
}) {
  const inv = item.investor;
  const chips = item.match?.chips ?? [];
  const name = inv.display_name ?? inv.profiles?.full_name ?? "—";
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-start gap-4">
        <EntityAvatar src={inv.avatar_url ?? inv.profiles?.avatar_url} name={name} size={64} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{name}</h2>
            <Badge className={scoreColor(item.match.score)}>{item.match.score}%</Badge>
          </div>
          {inv.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {inv.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {(inv.sectors ?? []).slice(0, 4).map((s: string) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="mt-3 rounded-md border bg-primary/5 p-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("project.matchesLabel")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((c: any) => (
              <Badge key={c.key + c.label} variant="secondary" className="text-xs">
                ✓ {c.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={disabled}
          onClick={() => onDecide("skipped")}
        >
          <X className="mr-2 h-4 w-4" />
          {t("discovery.skipInvestor")}
        </Button>
        <Button
          className="flex-1"
          disabled={disabled}
          onClick={() => onDecide("interested")}
        >
          <Check className="mr-2 h-4 w-4" />
          {t("discovery.interested")}
        </Button>
      </div>
    </Card>
  );
}
