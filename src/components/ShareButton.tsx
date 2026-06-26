import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = { title?: string; text?: string; url?: string };

export function ShareButton({ title, text, url }: Props) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);

  const onClick = async () => {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title, text, url: shareUrl });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setDone(true);
      toast.success(t("share.copied"));
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <Button type="button" variant="outline" onClick={onClick}>
      {done ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
      {t("share.button")}
    </Button>
  );
}
