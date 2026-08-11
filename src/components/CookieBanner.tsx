import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "capora_cookie_consent_v1";

export type CookiePrefs = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function getCookiePrefs(): CookiePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookiePrefs) : null;
  } catch {
    return null;
  }
}

function savePrefs(p: CookiePrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function CookieBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [configure, setConfigure] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getCookiePrefs()) setOpen(true);
  }, []);

  const decide = (prefs: Omit<CookiePrefs, "essential" | "decidedAt">) => {
    savePrefs({ essential: true, decidedAt: new Date().toISOString(), ...prefs });
    setOpen(false);
    if (typeof window !== "undefined" && typeof (window as Window & { gtag?: (...args: unknown[]) => void }).gtag === "function") {
      (window as Window & { gtag: (...args: unknown[]) => void }).gtag("consent", "update", {
        analytics_storage: prefs.analytics ? "granted" : "denied",
        ad_storage: prefs.marketing ? "granted" : "denied",
      });
      if (prefs.analytics) {
        (window as Window & { gtag: (...args: unknown[]) => void }).gtag("event", "page_view");
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:right-4 sm:left-auto sm:bottom-4 sm:max-w-md"
    >
      <div className="rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
        <h2 className="text-sm font-semibold">{t("cookieBanner.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("cookieBanner.body")}{" "}
          <Link to="/cookies" className="underline">
            {t("cookieBanner.learn")}
          </Link>
        </p>

        {configure && (
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3 rounded-md border border-border p-2">
              <div>
                <div className="font-medium">{t("cookieBanner.essential")}</div>
                <div className="text-muted-foreground">{t("cookieBanner.essentialDesc")}</div>
              </div>
              <span className="text-muted-foreground">{t("cookieBanner.always")}</span>
            </div>
            <label className="flex items-start justify-between gap-3 rounded-md border border-border p-2">
              <div>
                <div className="font-medium">{t("cookieBanner.analytics")}</div>
                <div className="text-muted-foreground">{t("cookieBanner.analyticsDesc")}</div>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
            </label>
            <label className="flex items-start justify-between gap-3 rounded-md border border-border p-2">
              <div>
                <div className="font-medium">{t("cookieBanner.marketing")}</div>
                <div className="text-muted-foreground">{t("cookieBanner.marketingDesc")}</div>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => decide({ analytics: true, marketing: true })}>
            {t("cookieBanner.acceptAll")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide({ analytics: false, marketing: false })}
          >
            {t("cookieBanner.rejectAll")}
          </Button>
          {!configure ? (
            <Button size="sm" variant="ghost" onClick={() => setConfigure(true)}>
              {t("cookieBanner.configure")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => decide({ analytics, marketing })}>
              {t("cookieBanner.savePrefs")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
