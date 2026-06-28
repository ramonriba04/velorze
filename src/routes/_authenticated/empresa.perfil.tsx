import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { upsertCompanyProfile } from "@/lib/profiles.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SingleSearchSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/media/ImageUpload";
import { ProfileCompletenessCard } from "@/components/ProfileCompletenessCard";
import { companyCompleteness } from "@/lib/completeness";
import { toast } from "sonner";
import { COUNTRIES, COMPANY_TYPES } from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/empresa/perfil")({
  head: () => ({ meta: [{ title: "Profile | Capora" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const save = useServerFn(upsertCompanyProfile);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["company_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  const current = { ...(data ?? {}), ...form };

  const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));
  const typeOptions = COMPANY_TYPES.map((c) => ({ value: c, label: t(`companyType.${c}`) }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          legal_name: current.legal_name ?? "",
          website: current.website || null,
          country: current.country || null,
          company_type: current.company_type || null,
          description: current.description || null,
          logo_url: current.logo_url || null,
        },
      });
      toast.success(t("common.saved"));
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const completeness = [
    { label: t("completeness.addLogo"), done: !!current.logo_url },
    { label: t("completeness.addDescription"), done: !!(current.description && current.description.length > 30) },
    { label: t("company.website"), done: !!current.website },
    { label: t("company.country"), done: !!current.country },
  ];

  if (!user || isLoading) return <div className="p-10">{t("common.loading")}</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 space-y-4">
      <CompletenessBadge items={completeness} />
      <Card className="p-6">
        <h1 className="text-2xl font-bold">{t("company.title")}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <ImageUpload
            value={current.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            userId={user.id}
            kind="logo"
            shape="square"
            label={t("company.title")}
            hint={t("media.logoHint")}
          />
          <div><Label>{t("company.legalName")}</Label><Input required defaultValue={data?.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
          <div><Label>{t("company.website")}</Label><Input type="url" defaultValue={data?.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div>
            <Label>{t("company.type")}</Label>
            <SingleSearchSelect
              options={typeOptions}
              value={current.company_type ?? ""}
              onChange={(v) => setForm({ ...form, company_type: v })}
              placeholder={t("picker.selectOne")}
              searchPlaceholder={t("picker.search")}
              emptyText={t("picker.noResults")}
              allowOther
              otherLabel={t("picker.other")}
            />
          </div>
          <div>
            <Label>{t("company.country")}</Label>
            <SingleSearchSelect
              options={countryOptions}
              value={current.country ?? ""}
              onChange={(v) => setForm({ ...form, country: v })}
              placeholder={t("picker.selectOne")}
              searchPlaceholder={t("picker.search")}
              emptyText={t("picker.noResults")}
              allowOther
              otherLabel={t("picker.other")}
            />
          </div>
          <div><Label>{t("company.description")}</Label><Textarea rows={4} defaultValue={data?.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => { setForm({}); toast.message(t("common.cancel")); }}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
