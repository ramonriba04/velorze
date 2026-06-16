import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "./ImageUpload";
import { useTranslation } from "react-i18next";

export type ProjectImage = { url: string; storage_path?: string | null; id?: string };

type Props = {
  images: ProjectImage[];
  onChange: (next: ProjectImage[]) => void;
  userId: string;
  max?: number;
};

export function MultiImageUpload({ images, onChange, userId, max = 8 }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = Math.max(0, max - images.length);
    const slice = files.slice(0, room);
    setBusy(true);
    try {
      const uploaded: ProjectImage[] = [];
      for (const f of slice) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name}: max 5MB`);
          continue;
        }
        const { url, path } = await uploadImage(f, userId, "project");
        uploaded.push({ url, storage_path: path });
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.url + i} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
            <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="remove"
            >
              <X className="h-3 w-3" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/90 border border-border">
                {t("media.cover")}
              </span>
            )}
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="aspect-square rounded-md border-2 border-dashed border-border bg-muted/40 hover:bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground transition"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs">{t("media.add")}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("media.projectHint", { max })}</p>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
    </div>
  );
}
