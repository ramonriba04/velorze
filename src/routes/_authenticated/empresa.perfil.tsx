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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/perfil")({
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const save = useServerFn(upsertCompanyProfile);

  const { data } = useQuery({
    queryKey: ["company_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  const current = { ...(data ?? {}), ...form };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          legal_name: current.legal_name ?? "",
          website: current.website || null,
          country: current.country || null,
          description: current.description || null,
          logo_url: current.logo_url || null,
        },
      });
      toast.success(t("common.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">{t("company.title")}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><Label>{t("company.legalName")}</Label><Input required defaultValue={data?.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
          <div><Label>{t("company.website")}</Label><Input type="url" defaultValue={data?.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div><Label>{t("company.country")}</Label><Input defaultValue={data?.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><Label>{t("company.description")}</Label><Textarea rows={4} defaultValue={data?.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <Button type="submit" className="w-full">{t("common.save")}</Button>
        </form>
      </Card>
    </div>
  );
}
