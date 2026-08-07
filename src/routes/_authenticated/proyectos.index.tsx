import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Search, MapPin, Filter, X, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { useBlockedIds } from "@/hooks/useBlockedIds";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { computeMatch, type MatchableInvestor } from "@/lib/matching";
import { EntityTypeBadge } from "@/components/EntityTypeBadge";
import { SECTORS, COUNTRIES } from "@/lib/taxonomy";
import { ProjectGridSkeleton } from "@/components/ui/skeletons";


const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  sector: z.string().optional().catch(undefined),
  sectorOther: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  countryOther: z.string().optional().catch(undefined),
  stage: z.enum(["idea", "crecimiento", "expansion"]).optional().catch(undefined),
  type: z.enum(["equity", "prestamo", "joint_venture", "convertible", "otro"]).optional().catch(undefined),
  min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  sort: z.enum(["match", "newest", "active"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/proyectos/")({
  validateSearch: searchSchema,
  component: ProjectsDiscovery,
});

const STAGES = ["idea", "crecimiento", "expansion"] as const;
const TYPES = ["equity", "prestamo", "joint_venture", "convertible", "otro"] as const;

function ProjectsDiscovery() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useMyRole();
  const sort = search.sort ?? "match";

  const setParam = (patch: Record<string, unknown>) =>
    navigate({
      to: "/proyectos",
      search: (prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev, ...patch };
        Object.keys(next).forEach((k) => {
          const v = next[k];
          if (v === "" || v === null || v === undefined || (typeof v === "string" && v === "all")) {
            delete next[k];
          }
        });
        return next;
      },
      replace: true,
    });

  const blockedIds = useBlockedIds(user?.id);

  const { data: investor } = useQuery({
    queryKey: ["investor_profile_for_sort", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("sectors, investment_types, ticket_min, ticket_max, countries, risk_level")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as MatchableInvestor | null;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["projects_discovery", search],
    queryFn: async () => {
      let query = supabase.from("projects").select("*").eq("status", "published");
      if (search.q) query = query.or(`title.ilike.%${search.q}%,description.ilike.%${search.q}%`);
      const sectorVal =
        search.sector === "otro" ? (search.sectorOther ?? "").trim() : search.sector;
      if (sectorVal) {
        if (search.sector === "otro") query = query.ilike("sector", `%${sectorVal}%`);
        else query = query.eq("sector", sectorVal);
      }
      const countryVal =
        search.country === "otro" ? (search.countryOther ?? "").trim() : search.country;
      if (countryVal) {
        if (search.country === "otro") query = query.ilike("country", `%${countryVal}%`);
        else query = query.eq("country", countryVal);
      }
      if (search.stage) query = query.eq("stage", search.stage);
      if (search.type) query = query.eq("investment_type", search.type);
      if (typeof search.min === "number") query = query.gte("ticket_max", search.min);
      if (typeof search.max === "number") query = query.lte("ticket_min", search.max);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const ownerIds = Array.from(new Set((items ?? []).map((p: any) => p.company_id)));
  const { data: owners } = useQuery({
    queryKey: ["projects_owners_entity", ownerIds.join(",")],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles")
        .select("user_id, entity_type").in("user_id", ownerIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((c: any) => { map[c.user_id] = c.entity_type ?? "empresa"; });
      return map;
    },
  });

  const sorted = (() => {
    const list = (items ?? []).filter((p: any) => !blockedIds.has(p.company_id));
    if (sort === "newest") {
      return [...list].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (sort === "active") {
      return [...list].sort(
        (a: any, b: any) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime(),
      );
    }
    // match (default) — needs investor profile, otherwise falls back to newest
    if (!investor) return list;
    return [...list]
      .map((p: any) => ({ p, s: computeMatch(p, investor).score }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  })();

  const activeCount = [
    search.q, search.sector, search.sectorOther, search.country, search.countryOther,
    search.stage, search.type,
    typeof search.min === "number" ? search.min : undefined,
    typeof search.max === "number" ? search.max : undefined,
  ].filter((v) => v !== undefined && v !== "").length;

  const clearAll = () => navigate({ to: "/proyectos", search: {}, replace: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">{t("discover.title")}</h1>
          <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
            {t("discover.manualBadge")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("discover.sub")}</p>
      </header>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search.q ?? ""}
            onChange={(e) => setParam({ q: e.target.value })}
            placeholder={t("discover.searchPlaceholder")}
            aria-label={t("discover.searchPlaceholder")}
            className="pl-9"
          />
        </div>


        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">{t("project.sector")}</Label>
            <Select
              value={search.sector ?? "all"}
              onValueChange={(v) => setParam({ sector: v, sectorOther: v === "otro" ? (search.sectorOther ?? "") : undefined })}
            >
              <SelectTrigger aria-label={t("project.sector")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("discover.anySector")}</SelectItem>
                {SECTORS.map((s) => <SelectItem key={s} value={s}>{t(`sector.${s}`)}</SelectItem>)}
                <SelectItem value="otro">{t("common.other")}</SelectItem>
              </SelectContent>
            </Select>
            {search.sector === "otro" && (
              <Input
                value={search.sectorOther ?? ""}
                onChange={(e) => setParam({ sectorOther: e.target.value })}
                placeholder={t("discover.otherSectorPh")}
                className="mt-1"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.country")}</Label>
            <Select
              value={search.country ?? "all"}
              onValueChange={(v) => setParam({ country: v, countryOther: v === "otro" ? (search.countryOther ?? "") : undefined })}
            >
              <SelectTrigger aria-label={t("project.country")}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">{t("discover.anyCountry")}</SelectItem>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value="otro">{t("common.other")}</SelectItem>
              </SelectContent>
            </Select>
            {search.country === "otro" && (
              <Input
                value={search.countryOther ?? ""}
                onChange={(e) => setParam({ countryOther: e.target.value })}
                placeholder={t("discover.otherCountryPh")}
                className="mt-1"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.stage")}</Label>
            <Select value={search.stage ?? "all"} onValueChange={(v) => setParam({ stage: v })}>
              <SelectTrigger aria-label={t("project.stage")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("discover.any")}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{t(`stage.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.investmentType")}</Label>
            <Select value={search.type ?? "all"} onValueChange={(v) => setParam({ type: v })}>
              <SelectTrigger aria-label={t("project.investmentType")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("discover.any")}</SelectItem>
                {TYPES.map((tp) => <SelectItem key={tp} value={tp}>{t(`investmentType.${tp}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.ticketMin")}</Label>
            <Input
              type="number" min={0}
              value={search.min ?? ""}
              onChange={(e) => setParam({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.ticketMax")}</Label>
            <Input
              type="number" min={0}
              value={search.max ?? ""}
              onChange={(e) => setParam({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="∞"
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t("discover.sortLabel")}</Label>
              <Select value={sort} onValueChange={(v) => setParam({ sort: v })}>
                <SelectTrigger className="h-8 w-[180px]" aria-label={t("discover.sortLabel")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">{t("discover.sortMatch")}</SelectItem>
                  <SelectItem value="newest">{t("discover.sortNewest")}</SelectItem>
                  <SelectItem value="active">{t("discover.sortActive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  {t("discover.activeFilters", { count: activeCount })}
                </span>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="mr-1 h-3.5 w-3.5" /> {t("discover.clearAll")}
                </Button>
              </div>
            )}
          </div>
          <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {t("discover.helperText")}
          </p>
        </div>
      </Card>

      {isLoading ? (
        <ProjectGridSkeleton count={6} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />

      ) : !sorted || sorted.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("discover.emptyTitle")}
          description={t("discover.emptySub")}
          ctaLabel={activeCount > 0 ? t("discover.clearAll") : undefined}
          onCta={activeCount > 0 ? clearAll : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p: any) => (
            <Link key={p.id} to="/proyectos/$id" params={{ id: p.id }} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full overflow-hidden hover:shadow-elegant transition-shadow">
                {p.cover_url ? (
                  <div className="aspect-[16/9] w-full bg-muted">
                    <img src={p.cover_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div aria-hidden className="aspect-[16/9] w-full gradient-primary opacity-80" />
                )}

                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.title}</h3>
                    <EntityTypeBadge type={owners?.[p.company_id]} size="xs" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{p.sector}</Badge>
                    <Badge variant="outline">{t(`stage.${p.stage}`)}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {p.country}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
