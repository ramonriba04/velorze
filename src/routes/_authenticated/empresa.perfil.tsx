import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { upsertCompanyProfile } from "@/lib/profiles.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { FormSkeleton } from "@/components/ui/skeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SingleSearchSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/media/ImageUpload";
import { ProfileCompletenessCard } from "@/components/ProfileCompletenessCard";
import { companyCompleteness } from "@/lib/completeness";
import { toast } from "sonner";
import { COUNTRIES, COMPANY_TYPES, ENTITY_TYPES } from "@/lib/taxonomy";

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
  const entityType: string = current.entity_type ?? "empresa";
  const isIndividual = entityType === "persona_fisica";

  const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));
  const typeOptions = COMPANY_TYPES.map((c) => ({ value: c, label: t(`companyType.${c}`) }));

  const completeness = companyCompleteness({
    legal_name: current.legal_name,
    country: current.country,
    description: current.description,
    contact_email: current.contact_email,
    logo_url: current.logo_url,
    website: current.website,
    entity_type: entityType,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          entity_type: entityType as any,
          legal_name: (current.legal_name ?? "").trim(),
          website: isIndividual ? null : (current.website || null),
          country: current.country || null,
          company_type: isIndividual ? null : (current.company_type || null),
          contact_email: current.contact_email || null,
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

  if (!user || isLoading) return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6"><FormSkeleton fields={5} /></Card>
      </div>
    );

  const emailInvalid =
    !!current.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(current.contact_email);
  const nameTooShort = !!current.legal_name && current.legal_name.trim().length < 2;
  const descTooShort = !!current.description && current.description.trim().length > 0 && current.description.trim().length < 20;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 space-y-4">
      <ProfileCompletenessCard
        pct={completeness.pct}
        complete={completeness.complete}
        missing={completeness.missingRequired}
        ctaTo="/empresa/perfil"
        ctaCopy={t("completeness.company.cta")}
      />

      <Card className="p-6">
        <h1 className="text-2xl font-bold">{isIndividual ? t("company.titleIndividual") : t("company.title")}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>{t("company.entityType")}</Label>
            <Select value={entityType} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e} value={e}>{t(`entityType.${e}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">{t("company.entityTypeHint")}</p>
          </div>

          <ImageUpload
            value={current.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            userId={user.id}
            kind="logo"
            shape="square"
            label={isIndividual ? t("company.profileImage") : t("company.title")}
            hint={isIndividual ? t("media.avatarHint") : t("media.logoHint")}
          />
          <div>
            <Label>{isIndividual ? t("company.publicName") : t("company.legalName")}</Label>
            <Input required defaultValue={data?.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            {nameTooShort && <p className="mt-1 text-xs text-destructive">{t("validate.nameShort")}</p>}
          </div>
          <div>
            <Label>{t("company.contactEmail")}</Label>
            <Input
              type="email"
              defaultValue={data?.contact_email ?? ""}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder={isIndividual ? "tu@email.com" : "contacto@empresa.com"}
            />
            {emailInvalid && <p className="mt-1 text-xs text-destructive">{t("validate.emailInvalid")}</p>}
          </div>
          {!isIndividual && (
            <>
              <div>
                <Label>{t("company.website")}</Label>
                <Input type="url" defaultValue={data?.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
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
            </>
          )}
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
          <div>
            <Label>{t("company.description")}</Label>
            <Textarea rows={4} defaultValue={data?.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {descTooShort && <p className="mt-1 text-xs text-destructive">{t("validate.descriptionRange")}</p>}
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
