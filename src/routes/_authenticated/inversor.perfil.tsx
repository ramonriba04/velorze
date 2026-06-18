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
import { ImageUpload } from "@/components/media/ImageUpload";
import { CompletenessBadge } from "@/components/media/CompletenessBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inversor/perfil")({
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          kind: current.kind ?? "personal",
          display_name: current.display_name || null,
          sectors: (current.sectors ?? []).filter(Boolean),
          ticket_min: current.ticket_min ? Number(current.ticket_min) : null,
          ticket_max: current.ticket_max ? Number(current.ticket_max) : null,
          countries: (current.countries ?? []).filter(Boolean),
          investment_types: current.investment_types ?? [],
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

  const arr = (v: any): string[] => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

  const completeness = [
    { label: t("completeness.addAvatar"), done: !!current.avatar_url },
    { label: t("completeness.addDescription"), done: !!(current.description && current.description.length > 30) },
    { label: t("investor.sectors"), done: (current.sectors ?? []).length > 0 },
    { label: t("investor.countries"), done: (current.countries ?? []).length > 0 },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
      <CompletenessBadge items={completeness} />
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
            <Input
              placeholder="fintech, real estate, tecnología"
              defaultValue={(data?.sectors ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, sectors: arr(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">{t("investor.sectorsHint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("project.ticketMin")}</Label>
              <Input type="number" defaultValue={data?.ticket_min ?? ""} onChange={(e) => setForm({ ...form, ticket_min: e.target.value })} />
            </div>
            <div>
              <Label>{t("project.ticketMax")}</Label>
              <Input type="number" defaultValue={data?.ticket_max ?? ""} onChange={(e) => setForm({ ...form, ticket_max: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t("investor.countries")}</Label>
            <Input
              placeholder="España, México, USA"
              defaultValue={(data?.countries ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, countries: arr(e.target.value) })}
            />
          </div>
          <div>
            <Label>{t("investor.types")}</Label>
            <Input
              placeholder="equity, prestamo, joint_venture, convertible, otro"
              defaultValue={(data?.investment_types ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, investment_types: arr(e.target.value) })}
            />
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
            <Textarea rows={4} defaultValue={data?.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>{t("investor.displayName")}</Label>
            <Input defaultValue={data?.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
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

