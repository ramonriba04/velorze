import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createProject, updateProject, deleteProject } from "@/lib/projects.functions";
import { setProjectImages } from "@/lib/project-images.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SingleSearchSelect } from "@/components/ui/multi-select";
import { MultiImageUpload, type ProjectImage } from "@/components/media/MultiImageUpload";
import {
  SECTORS,
  INVESTMENT_TYPE_OPTIONS,
  BUSINESS_STAGE_OPTIONS,
  COUNTRIES,
  INVESTMENT_RANGES,
} from "@/lib/taxonomy";
import { ProfileCompletenessCard } from "@/components/ProfileCompletenessCard";
import { PublishBlockedDialog } from "@/components/PublishBlockedDialog";
import { companyCompleteness } from "@/lib/completeness";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/nuevo")({
  component: () => <ProjectForm mode="create" />,
});

export function ProjectForm({ mode }: { mode: "create" | "edit" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useMyRole();
  const params = useParams({ strict: false }) as { id?: string };
  const create = useServerFn(createProject);
  const update = useServerFn(updateProject);
  const del = useServerFn(deleteProject);
  const saveImages = useServerFn(setProjectImages);

  const [form, setForm] = useState<any>({
    title: "", description: "", sector: "", investment_type: "equity",
    capital_required: "", ticket_min: "", ticket_max: "", country: "",
    stage: "crecimiento", status: "published",
  });
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [loaded, setLoaded] = useState(mode === "create");

  useEffect(() => {
    if (mode === "edit" && params.id) {
      supabase.from("projects").select("*").eq("id", params.id).maybeSingle().then(({ data }) => {
        if (data) setForm(data);
        setLoaded(true);
      });
      supabase.from("project_images").select("url, storage_path, id").eq("project_id", params.id).order("sort_order").then(({ data }) => {
        if (data) setImages(data as ProjectImage[]);
      });
    }
  }, [mode, params.id]);

  // Debounced autosave (edit mode only, after initial load)
  useEffect(() => {
    if (mode !== "edit" || !params.id || !loaded) return;
    if (!form.title || !form.description) return;
    setSaveState("saving");
    const handle = setTimeout(async () => {
      try {
        await update({
          data: {
            id: params.id!,
            title: form.title,
            description: form.description,
            sector: form.sector,
            investment_type: form.investment_type,
            capital_required: Number(form.capital_required) || 0,
            ticket_min: form.ticket_min ? Number(form.ticket_min) : null,
            ticket_max: form.ticket_max ? Number(form.ticket_max) : null,
            country: form.country,
            stage: form.stage,
            status: form.status,
            cover_url: images[0]?.url ?? form.cover_url ?? null,
          },
        });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 1200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, images, loaded, mode, params.id]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title, description: form.description, sector: form.sector,
        investment_type: form.investment_type,
        capital_required: Number(form.capital_required),
        ticket_min: form.ticket_min ? Number(form.ticket_min) : null,
        ticket_max: form.ticket_max ? Number(form.ticket_max) : null,
        country: form.country, stage: form.stage, status: form.status,
        cover_url: images[0]?.url ?? form.cover_url ?? null,
      };
      let projectId = params.id;
      if (mode === "create") {
        const r = await create({ data: payload });
        projectId = r.id;
      } else {
        await update({ data: { id: params.id!, ...payload } });
      }
      if (projectId) {
        await saveImages({ data: { project_id: projectId, images: images.map((i) => ({ url: i.url, storage_path: i.storage_path ?? null })) } });
      }
      toast.success(t("common.saved"));
      navigate({ to: "/empresa" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDelete = async () => {
    if (!params.id) return;
    if (!confirm(t("common.confirm") + "?")) return;
    await del({ data: { id: params.id } });
    toast.success(t("common.deleted"));
    navigate({ to: "/empresa" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{mode === "create" ? t("nav.newProject") : t("common.edit")}</h1>
          {mode === "edit" && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {saveState === "saving" ? t("autosave.saving") : saveState === "saved" ? t("autosave.saved") : ""}
            </span>
          )}
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><Label>{t("project.title")}</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>{t("project.description")}</Label><Textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {user && (
            <div>
              <Label>{t("media.gallery")}</Label>
              <div className="mt-2">
                <MultiImageUpload images={images} onChange={setImages} userId={user.id} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>{t("project.sector")}</Label>
              <SingleSearchSelect
                options={SECTORS.map((s) => ({ value: s, label: t(`sector.${s}`) }))}
                value={form.sector ?? ""}
                onChange={(v) => setForm({ ...form, sector: v })}
                placeholder={t("picker.selectOne")}
                searchPlaceholder={t("picker.search")}
                emptyText={t("picker.noResults")}
                allowOther
                otherLabel={t("picker.other")}
              />
            </div>
            <div>
              <Label>{t("project.country")}</Label>
              <SingleSearchSelect
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                value={form.country ?? ""}
                onChange={(v) => setForm({ ...form, country: v })}
                placeholder={t("picker.selectOne")}
                searchPlaceholder={t("picker.search")}
                emptyText={t("picker.noResults")}
                allowOther
                otherLabel={t("picker.other")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>{t("project.investmentType")}</Label>
              <Select value={form.investment_type} onValueChange={(v) => setForm({ ...form, investment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPE_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>{t(`investmentType.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("project.stage")}</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_STAGE_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>{t(`stage.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("project.capital")} — {t("range.label")}</Label>
            <Select
              value={(() => {
                const cap = Number(form.capital_required) || 0;
                const match = INVESTMENT_RANGES.find((r) => cap >= r.min && (r.max == null || cap <= r.max));
                return match?.key ?? "custom";
              })()}
              onValueChange={(key) => {
                if (key === "custom") return;
                const r = INVESTMENT_RANGES.find((x) => x.key === key);
                if (r) setForm({ ...form, capital_required: String(r.min || r.max || 0) });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_RANGES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{t(`range.${r.key}`)}</SelectItem>
                ))}
                <SelectItem value="custom">{t("range.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>{t("project.capital")}</Label><Input required type="number" value={form.capital_required} onChange={(e) => setForm({ ...form, capital_required: e.target.value })} /></div>
            <div><Label>{t("project.ticketMin")}</Label><Input type="number" value={form.ticket_min ?? ""} onChange={(e) => setForm({ ...form, ticket_min: e.target.value })} /></div>
            <div><Label>{t("project.ticketMax")}</Label><Input type="number" value={form.ticket_max ?? ""} onChange={(e) => setForm({ ...form, ticket_max: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">{t("common.save")}</Button>
            {mode === "edit" && <Button type="button" variant="destructive" onClick={onDelete}>{t("common.delete")}</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}

