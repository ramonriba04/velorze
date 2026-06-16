import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const BUCKET = "project-images";
const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // ~10 years

export async function uploadImage(file: File, userId: string, kind: "avatar" | "logo" | "project"): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (signErr || !data) throw signErr ?? new Error("Sign error");
  return { url: data.signedUrl, path };
}

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  kind: "avatar" | "logo" | "project";
  shape?: "circle" | "square";
  label?: string;
  hint?: string;
};

export function ImageUpload({ value, onChange, userId, kind, shape = "square", label, hint }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setBusy(true);
    try {
      const { url } = await uploadImage(file, userId, kind);
      onChange(url);
      toast.success(t("common.saved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex items-center gap-3">
        <div className={`relative h-20 w-20 ${radius} bg-muted overflow-hidden border border-border flex items-center justify-center`}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
            {value ? t("media.replace") : t("media.upload")}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={busy}>
              <X className="h-3 w-3 mr-1" />
              {t("media.remove")}
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}
