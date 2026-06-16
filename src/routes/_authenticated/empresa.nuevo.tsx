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
import { MultiImageUpload, type ProjectImage } from "@/components/media/MultiImageUpload";
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

  useEffect(() => {
    if (mode === "edit" && params.id) {
      supabase.from("projects").select("*").eq("id", params.id).maybeSingle().then(({ data }) => {
        if (data) setForm(data);
      });
      supabase.from("project_images").select("url, storage_path, id").eq("project_id", params.id).order("sort_order").then(({ data }) => {
        if (data) setImages(data as ProjectImage[]);
      });
    }
  }, [mode, params.id]);

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
        <h1 className="text-2xl font-bold">{mode === "create" ? t("nav.newProject") : t("common.edit")}</h1>
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("project.sector")}</Label><Input required value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
            <div><Label>{t("project.country")}</Label><Input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("project.investmentType")}</Label>
              <Select value={form.investment_type} onValueChange={(v) => setForm({ ...form, investment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["equity","prestamo","joint_venture","convertible","otro"].map((v) => (
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
                  {["idea","crecimiento","expansion"].map((v) => (
                    <SelectItem key={v} value={v}>{t(`stage.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
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

