import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Search, MapPin, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  sector: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  stage: z.enum(["idea", "crecimiento", "expansion"]).optional().catch(undefined),
  type: z.enum(["equity", "prestamo", "joint_venture", "convertible", "otro"]).optional().catch(undefined),
  min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  max: z.coerce.number().int().nonnegative().optional().catch(undefined),
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

  const { data: items, isLoading } = useQuery({
    queryKey: ["projects_discovery", search],
    queryFn: async () => {
      let query = supabase.from("projects").select("*").eq("status", "published");
      if (search.q) query = query.or(`title.ilike.%${search.q}%,description.ilike.%${search.q}%`);
      if (search.sector) query = query.ilike("sector", `%${search.sector}%`);
      if (search.country) query = query.ilike("country", `%${search.country}%`);
      if (search.stage) query = query.eq("stage", search.stage);
      if (search.type) query = query.eq("investment_type", search.type);
      if (typeof search.min === "number") query = query.gte("ticket_max", search.min);
      if (typeof search.max === "number") query = query.lte("ticket_min", search.max);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const activeCount = [
    search.q, search.sector, search.country, search.stage, search.type,
    typeof search.min === "number" ? search.min : undefined,
    typeof search.max === "number" ? search.max : undefined,
  ].filter((v) => v !== undefined && v !== "").length;

  const clearAll = () => navigate({ to: "/proyectos", search: {}, replace: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("discover.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("discover.sub")}</p>
      </header>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search.q ?? ""}
            onChange={(e) => setParam({ q: e.target.value })}
            placeholder={t("discover.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">{t("project.sector")}</Label>
            <Input
              value={search.sector ?? ""}
              onChange={(e) => setParam({ sector: e.target.value })}
              placeholder={t("discover.anySector")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.country")}</Label>
            <Input
              value={search.country ?? ""}
              onChange={(e) => setParam({ country: e.target.value })}
              placeholder={t("discover.anyCountry")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.stage")}</Label>
            <Select value={search.stage ?? "all"} onValueChange={(v) => setParam({ stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("discover.any")}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{t(`stage.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("project.investmentType")}</Label>
            <Select value={search.type ?? "all"} onValueChange={(v) => setParam({ type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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

        {activeCount > 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {t("discover.activeFilters", { count: activeCount })}
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="mr-1 h-3.5 w-3.5" /> {t("discover.clearAll")}
            </Button>
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("discover.emptyTitle")}
          description={t("discover.emptySub")}
          ctaLabel={t("discover.clearAll")}
          onCta={activeCount > 0 ? clearAll : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p: any) => (
            <Card key={p.id} className="h-full overflow-hidden">
              {p.cover_url ? (
                <div className="aspect-[16/9] w-full bg-muted">
                  <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] w-full gradient-primary opacity-80" />
              )}
              <div className="space-y-2 p-4">
                <h3 className="font-semibold leading-tight">{p.title}</h3>
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
          ))}
        </div>
      )}
    </div>
  );
}

