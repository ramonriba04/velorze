import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Home, Search, Heart, MessageCircle, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMyRole } from "@/hooks/useAuth";

const DONE_KEY = "capora_tour_done_v1";
const PENDING_KEY = "capora_tour_pending";

/** Marks the tour to appear on the next authenticated screen. */
export function requestAppTour() {
  try {
    localStorage.removeItem(DONE_KEY);
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

const STEPS = [
  { key: "home", icon: Home },
  { key: "explore", icon: Search },
  { key: "favorites", icon: Heart },
  { key: "messages", icon: MessageCircle },
  { key: "notifications", icon: Bell },
] as const;

export function AppTour() {
  const { t } = useTranslation();
  const { role } = useMyRole();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!role || role === "admin") return;
    try {
      const pending = localStorage.getItem(PENDING_KEY);
      const done = localStorage.getItem(DONE_KEY);
      if (pending && !done) setOpen(true);
    } catch {
      /* storage unavailable */
    }
  }, [role]);

  const close = () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
      localStorage.removeItem(PENDING_KEY);
    } catch {
      /* storage unavailable */
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("tour.title")}
      className="fixed inset-x-0 bottom-0 z-50 p-3 pb-24 md:pb-6 animate-in fade-in slide-in-from-bottom-4"
    >
      <Card className="mx-auto max-w-md space-y-3 p-5 shadow-elegant">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          {t("tour.title")}
          <span className="ml-auto text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon aria-hidden className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium leading-tight">{t(`tour.step.${current.key}.title`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`tour.step.${current.key}.desc`)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={close}>
            {t("tour.skip")}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t("common.back")}
              </Button>
            )}
            {isLast ? (
              <Link to={role === "empresa" ? "/empresa" : "/inversor"} onClick={close}>
                <Button size="sm">{t("tour.done")}</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                {t("tour.next")}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
