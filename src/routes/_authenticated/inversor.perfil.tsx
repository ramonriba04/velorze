import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { upsertInvestorProfile } from "@/lib/profiles.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/media/ImageUpload";
import { ProfileCompletenessCard } from "@/components/ProfileCompletenessCard";
import { investorCompleteness } from "@/lib/completeness";
import { toast } from "sonner";
import {
  SECTORS,
  INVESTMENT_TYPE_OPTIONS,
  COUNTRIES,
  INVESTMENT_RANGES,
  dedupNormalized,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/inversor/perfil")({
  head: () => ({ meta: [{ title: "Profile | Capora" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: InvestorProfile,
});

function InvestorProfile() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const save = useServerFn(upsertInvestorProfile);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investor_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("investor_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  const current = { ...(data ?? {}), ...form };

  const sectors: string[] = dedupNormalized(current.sectors ?? []);
  const countries: string[] = dedupNormalized(current.countries ?? []);
  const investmentTypes: string[] = current.investment_types ?? [];

  const sectorOptions = SECTORS.map((s) => ({ value: s, label: t(`sector.${s}`) }));
  const typeOptions = INVESTMENT_TYPE_OPTIONS.map((v) => ({ value: v, label: t(`investmentType.${v}`) }));
  const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));
  const rangeOptions = INVESTMENT_RANGES.map((r) => ({ value: r.key, label: t(`range.${r.key}`) }));

  // Determine current range preset (if it matches one)
  const currentRangeKey = (() => {
    const min = current.ticket_min ? Number(current.ticket_min) : null;
    const max = current.ticket_max ? Number(current.ticket_max) : null;
    return INVESTMENT_RANGES.find((r) => r.min === (min ?? 0) && r.max === max)?.key ?? "custom";
  })();
  const [rangeKey, setRangeKey] = useState<string>(currentRangeKey);

  const applyRange = (key: string) => {
    setRangeKey(key);
    if (key === "custom") return;
    const r = INVESTMENT_RANGES.find((x) => x.key === key);
    if (!r) return;
    setForm({ ...form, ticket_min: r.min, ticket_max: r.max ?? "" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          kind: current.kind ?? "personal",
          display_name: current.display_name || null,
          sectors,
          ticket_min: current.ticket_min ? Number(current.ticket_min) : null,
          ticket_max: current.ticket_max ? Number(current.ticket_max) : null,
          countries,
          investment_types: investmentTypes,
          risk_level: current.risk_level ?? "medio",
          description: current.description || null,
          avatar_url: current.avatar_url || null,
        },
      });
      toast.success(t("common.saved"));
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!user || isLoading) return <div className="p-10">{t("common.loading")}</div>;

  const completeness = investorCompleteness({
    display_name: current.display_name,
    sectors,
    ticket_min: current.ticket_min ? Number(current.ticket_min) : null,
    ticket_max: current.ticket_max ? Number(current.ticket_max) : null,
    countries,
    investment_types: investmentTypes,
    description: current.description,
  });
  const nameTooShort = !!current.display_name && current.display_name.trim().length < 2;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 space-y-4">
      <ProfileCompletenessCard
        pct={completeness.pct}
        complete={completeness.complete}
        missing={completeness.missingRequired}
        ctaTo="/inversor/perfil"
        ctaCopy={t("completeness.investor.cta")}
      />
      <Card className="p-6">
        <h1 className="text-2xl font-bold">{t("investor.title")}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <ImageUpload
            value={current.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            userId={user!.id}
            kind="avatar"
            shape="circle"
            label={t("nav.profile")}
            hint={t("media.avatarHint")}
          />
          <div>
            <Label>{t("investor.kind")}</Label>
            <Select value={current.kind ?? "personal"} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t("investor.personal")}</SelectItem>
                <SelectItem value="corporativo">{t("investor.corporativo")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("investor.sectors")}</Label>
            <MultiSelect
              options={sectorOptions}
              value={sectors}
              onChange={(v) => setForm({ ...form, sectors: v })}
              placeholder={t("picker.selectSectors")}
              searchPlaceholder={t("picker.search")}
              emptyText={t("picker.noResults")}
              allowOther
              otherLabel={t("picker.other")}
              customLabel={t("picker.addCustom")}
            />
            <p className="text-xs text-muted-foreground mt-1">{t("investor.sectorsHint")}</p>
          </div>

          <div>
            <Label>{t("investor.types")}</Label>
            <MultiSelect
              options={typeOptions}
              value={investmentTypes}
              onChange={(v) => setForm({ ...form, investment_types: v })}
              placeholder={t("picker.selectTypes")}
              searchPlaceholder={t("picker.search")}
              emptyText={t("picker.noResults")}
            />
          </div>

          <div>
            <Label>{t("range.label")}</Label>
            <Select value={rangeKey} onValueChange={applyRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {rangeOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
                <SelectItem value="custom">{t("range.custom")}</SelectItem>
              </SelectContent>
            </Select>
            {rangeKey === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label>{t("project.ticketMin")}</Label>
                  <Input type="number" value={current.ticket_min ?? ""} onChange={(e) => setForm({ ...form, ticket_min: e.target.value })} />
                </div>
                <div>
                  <Label>{t("project.ticketMax")}</Label>
                  <Input type="number" value={current.ticket_max ?? ""} onChange={(e) => setForm({ ...form, ticket_max: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>{t("investor.countries")}</Label>
            <MultiSelect
              options={countryOptions}
              value={countries}
              onChange={(v) => setForm({ ...form, countries: v })}
              placeholder={t("picker.selectCountries")}
              searchPlaceholder={t("picker.search")}
              emptyText={t("picker.noResults")}
              allowOther
              otherLabel={t("picker.other")}
              customLabel={t("picker.addCustom")}
            />
            <p className="text-xs text-muted-foreground mt-1">{t("investor.countriesHint")}</p>
          </div>

          <div>
            <Label>{t("risk.label")}</Label>
            <Select value={current.risk_level ?? "medio"} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bajo">{t("risk.bajo")}</SelectItem>
                <SelectItem value="medio">{t("risk.medio")}</SelectItem>
                <SelectItem value="alto">{t("risk.alto")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("investor.description")}</Label>
            <Textarea rows={4} value={current.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>{t("investor.displayName")}</Label>
            <Input value={current.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            {nameTooShort && <p className="mt-1 text-xs text-destructive">{t("validate.nameShort")}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => { setForm({}); toast.message(t("common.cancel")); }}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
