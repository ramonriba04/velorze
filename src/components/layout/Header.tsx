import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Globe, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const set = (lng: "es" | "en") => i18n.changeLanguage(lng);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" /> {i18n.resolvedLanguage?.toUpperCase() ?? "ES"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => set("es")}>Español</DropdownMenuItem>
        <DropdownMenuItem onClick={() => set("en")}>English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { user, role } = useMyRole();

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary shadow-elegant" />
          <span className="text-lg font-semibold tracking-tight">Capora</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <Link to="/app" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                {t("nav.dashboard")}
              </Link>
              <Link to="/mensajes" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                {t("nav.messages")}
              </Link>
              {role === "admin" && (
                <Link to="/admin" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  {t("nav.admin")}
                </Link>
              )}
            </>
          ) : (
            <>
              <a href="/#how" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{t("nav.how")}</a>
              <Link to="/legal" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{t("footer.legal")}</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </Button>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block">
                <Button variant="ghost" size="sm">{t("nav.login")}</Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="sm" className="shadow-elegant">{t("nav.signup")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Capora. {t("footer.rights")}</span>
          <div className="flex gap-4">
            <Link to="/legal" className="hover:text-foreground">{t("footer.legal")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
