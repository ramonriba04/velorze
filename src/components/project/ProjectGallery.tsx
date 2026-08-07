import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  images: { url: string }[];
  alt: string;
  /** First image is the LCP element on project detail pages. */
  priority?: boolean;
};

export function ProjectGallery({ images, alt, priority = false }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = images.length;
  const hasMulti = count > 1;

  const goPrev = () => setActive((i) => (i - 1 + count) % count);
  const goNext = () => setActive((i) => (i + 1) % count);

  useEffect(() => {
    if (!hasMulti && !zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasMulti) goPrev();
      if (e.key === "ArrowRight" && hasMulti) goNext();
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMulti, count, zoom]);

  if (count === 0) return null;

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStart.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStart.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStart.current;
      if (hasMulti && Math.abs(dx) > 50) (dx < 0 ? goNext() : goPrev());
      touchStart.current = null;
    },
  };

  return (
    <div className="bg-muted">
      <div className="relative" {...swipeHandlers}>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={t("gallery.enlarge")}
          className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <img
            src={images[active]?.url ?? ""}
            alt={alt}
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="w-full aspect-video object-cover"
          />
        </button>
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium">
          <Expand aria-hidden className="h-3 w-3" />
          {t("gallery.enlarge")}
        </span>
        {hasMulti && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label={t("gallery.prev")}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={t("gallery.next")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium"
            >
              {active + 1} / {count}
            </span>
          </>
        )}
      </div>

      {hasMulti && (
        <div className="flex gap-2 overflow-x-auto border-t border-border p-3">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${t("gallery.image")} ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded border ${i === active ? "border-primary" : "border-border"}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent
          className="max-w-5xl border-none bg-transparent p-0 shadow-none [&>button]:hidden"
          aria-label={alt}
        >
          <div className="relative" {...swipeHandlers}>
            <img
              src={images[active]?.url ?? ""}
              alt={alt}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label={t("common.close")}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-2 shadow hover:bg-background"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
            {hasMulti && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label={t("gallery.prev")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow hover:bg-background"
                >
                  <ChevronLeft aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label={t("gallery.next")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow hover:bg-background"
                >
                  <ChevronRight aria-hidden className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                  {active + 1} / {count}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
