import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { Compass, MapPin, Sparkles, X, Check, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getDiscoveryFeed,
  recordDiscoveryDecision,
} from "@/lib/discovery.functions";
import { supabase } from "@/integrations/supabase/client";
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
    <div className="mx-auto max-w-3xl px-3 py-6 pb-28 sm:px-6 sm:py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{t("discovery.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("discovery.sub")}</p>
        </div>
        <Link to="/conexiones">
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("discovery.connections")}</span>
          </Button>
        </Link>
      </header>

      <Card className="mt-3 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("discovery.dailyLimit")}</span>
          <span>{used} / {cap}</span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </Card>

      <div className="mt-4">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>
        ) : !current ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={t("discovery.emptyTitle")}
            description={t("discovery.emptySub")}
            ctaLabel={t("discovery.connections")}
            ctaTo="/conexiones"
            secondaryLabel={t("nav.explore")}
            secondaryTo="/proyectos"
          />
        ) : (
          <SwipeDeck
            key={current.kind === "project" ? current.project.id : current.investor.user_id}
            disabled={mut.isPending}
            onDecide={(decision) => {
              if (current.kind === "project") {
                mut.mutate({
                  target_user_id: current.project.company_id,
                  project_id: current.project.id,
                  decision,
                });
              } else {
                mut.mutate({
                  target_user_id: current.investor.user_id,
                  project_id: null,
                  decision,
                });
              }
            }}
          >
            {current.kind === "project" ? (
              <ProjectCard item={current} t={t} />
            ) : (
              <InvestorCard item={current} t={t} />
            )}
          </SwipeDeck>
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

/* ---------- Swipe deck ---------- */

function SwipeDeck({
  children,
  onDecide,
  disabled,
}: {
  children: React.ReactNode;
  onDecide: (d: "interested" | "skipped") => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [exiting, setExiting] = useState<null | "left" | "right">(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    setDx(0);
    setExiting(null);
  }, [children]);

  const onStart = (x: number) => { if (!disabled) startX.current = x; };
  const onMove = (x: number) => {
    if (startX.current == null) return;
    setDx(x - startX.current);
  };
  const onEnd = () => {
    if (startX.current == null) return;
    startX.current = null;
    const threshold = 110;
    if (dx > threshold) commit("right");
    else if (dx < -threshold) commit("left");
    else setDx(0);
  };
  const commit = (dir: "left" | "right") => {
    setExiting(dir);
    setTimeout(() => onDecide(dir === "right" ? "interested" : "skipped"), 180);
  };

  const rot = Math.max(-12, Math.min(12, dx / 14));
  const opacity = exiting ? 0 : 1;
  const translateX = exiting === "right" ? 600 : exiting === "left" ? -600 : dx;

  const rightHint = Math.max(0, Math.min(1, dx / 120));
  const leftHint = Math.max(0, Math.min(1, -dx / 120));

  return (
    <div className="relative select-none">
      <div
        ref={ref}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onStart(e.clientX); }}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        style={{
          transform: `translateX(${translateX}px) rotate(${rot}deg)`,
          opacity,
          transition: startX.current ? "none" : "transform 180ms ease-out, opacity 180ms ease-out",
          touchAction: "pan-y",
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}

        {/* Swipe hints */}
        <div
          className="pointer-events-none absolute left-4 top-4 rounded-md border-2 border-destructive bg-background/80 px-3 py-1 text-sm font-bold uppercase text-destructive"
          style={{ opacity: leftHint, transform: `rotate(-8deg)` }}
        >
          {/* eslint-disable-next-line react/jsx-no-literals */}
          No encaja
        </div>
        <div
          className="pointer-events-none absolute right-4 top-4 rounded-md border-2 border-success bg-background/80 px-3 py-1 text-sm font-bold uppercase text-success"
          style={{ opacity: rightHint, transform: `rotate(8deg)` }}
        >
          {/* eslint-disable-next-line react/jsx-no-literals */}
          Me interesa
        </div>
      </div>

      {/* Action buttons (desktop + fallback) */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={disabled || !!exiting}
          onClick={() => commit("left")}
        >
          <X className="mr-2 h-4 w-4" />
          Omitir
        </Button>
        <Button
          className="flex-1"
          disabled={disabled || !!exiting}
          onClick={() => commit("right")}
        >
          <Check className="mr-2 h-4 w-4" />
          Me interesa
        </Button>
      </div>
    </div>
  );
}

/* ---------- Project card ---------- */

function ProjectCard({ item, t }: { item: any; t: (k: string) => string }) {
  const p = item.project;
  const chips = item.match?.chips ?? [];

  const { data: images } = useQuery({
    queryKey: ["discovery_project_images", p.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_images")
        .select("url")
        .eq("project_id", p.id)
        .order("sort_order");
      return (data ?? []) as { url: string }[];
    },
  });

  const gallery = (images && images.length ? images : (p.cover_url ? [{ url: p.cover_url }] : [])) as { url: string }[];
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => { setImgIdx(0); }, [p.id]);

  const hasImg = gallery.length > 0;
  const current = gallery[imgIdx];
  const next = () => setImgIdx((i) => (i + 1) % gallery.length);
  const prev = () => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length);

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-muted sm:aspect-[16/10]">
        {hasImg ? (
          <img src={current.url} alt={p.title} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="h-full w-full gradient-primary opacity-80" />
        )}
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium">
              {imgIdx + 1} / {gallery.length}
            </span>
          </>
        )}
        <Badge className={`${scoreColor(item.match.score)} absolute left-3 top-3`}>{item.match.score}%</Badge>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">{p.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{p.sector}</Badge>
            <Badge variant="outline">{t(`stage.${p.stage}`)}</Badge>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {p.country}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-5">{p.description}</p>

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

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <Link
            to="/proyectos/$id"
            params={{ id: p.id }}
            className="text-xs text-primary hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {t("project.viewProject")}
          </Link>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Investor card ---------- */

function InvestorCard({ item, t }: { item: any; t: (k: string) => string }) {
  const inv = item.investor;
  const chips = item.match?.chips ?? [];
  const name = inv.display_name ?? inv.profiles?.full_name ?? "—";

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/10] w-full gradient-primary opacity-90 flex items-end p-5">
        <Badge className={`${scoreColor(item.match.score)}`}>{item.match.score}%</Badge>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <EntityAvatar src={inv.avatar_url ?? inv.profiles?.avatar_url} name={name} size={72} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold">{name}</h2>
            {inv.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{inv.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {(inv.sectors ?? []).slice(0, 6).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
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
      </div>
    </Card>
  );
}
