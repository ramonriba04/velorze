import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import i18n, { detectClientLanguage } from "../lib/i18n";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CookieBanner } from "@/components/CookieBanner";


const SITE_URL = "https://capora-ai-connect.lovable.app";
const OG_IMAGE = `${SITE_URL}/__l5e/assets-v1/a56efdb2-a5ec-4e38-86c0-563dfbd9bd43/og-capora.jpg`;
const DEFAULT_TITLE = "Capora — Marketplace inteligente de inversión";
const DEFAULT_DESC = "Conecta proyectos con los inversores adecuados mediante matching inteligente de compatibilidad.";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
          <Compass className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-muted-foreground">
          {t("notFound.code")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t("notFound.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("notFound.sub")}</p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-2 sm:flex-row">
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.home")}
          </a>
          <a
            href="/proyectos"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("notFound.explore")}
          </a>
        </div>
        <a href="/ayuda" className="mt-5 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t("notFound.help")}
        </a>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo no fue bien</h1>
        <p className="mt-2 text-sm text-muted-foreground">Intenta recargar la página.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >Reintentar</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b2545" },
      { name: "apple-mobile-web-app-title", content: "Capora" },
      { name: "application-name", content: "Capora" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESC },
      { property: "og:site_name", content: "Capora" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESC },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Switch i18n language after hydration to avoid SSR text mismatches.
    const lng = detectClientLanguage();
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <MobileBottomNav />
      <CookieBanner />
      <Toaster />

    </QueryClientProvider>
  );
}
