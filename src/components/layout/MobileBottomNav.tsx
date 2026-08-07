import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Heart, MessageCircle, Compass, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyRole } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const { location } = useRouterState();

  if (!user) return null;
  if (!role) return null;

  const isCompany = role === "empresa";
  const homeTo = isCompany ? "/empresa" : "/inversor";
  const favTo = isCompany ? "/empresa" : "/inversor/favoritos";

  const items: Array<{ to: string; icon: typeof Home; label: string; match: (p: string) => boolean; hide?: boolean }> = [
    { to: homeTo, icon: Home, label: t("nav.home"), match: (p) => p === homeTo },
    { to: "/proyectos", icon: Search, label: t("nav.explore"), match: (p) => p.startsWith("/proyectos") && !p.includes("/$") },
    { to: "/descubrir", icon: Compass, label: t("nav.discover"), match: (p) => p.startsWith("/descubrir") },
    { to: favTo, icon: Heart, label: t("nav.favorites"), match: (p) => p.startsWith("/inversor/favoritos"), hide: isCompany },
    { to: "/mensajes", icon: MessageCircle, label: t("nav.messages"), match: (p) => p.startsWith("/mensajes") },
  ];

  const visible = items.filter((i) => !i.hide);

  return (
    <nav
      aria-label={t("nav.primary", "Primary")}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border/60 bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map(({ to, icon: Icon, label, match }) => {
          const active = match(location.pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

