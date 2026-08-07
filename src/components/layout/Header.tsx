import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, LogOut, Settings, User as UserIcon, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { NotificationsBell } from "@/components/layout/NotificationsBell";


export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const label = mounted ? (i18n.resolvedLanguage?.toUpperCase() ?? "ES") : "ES";
  const set = (lng: "es" | "en") => i18n.changeLanguage(lng);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" /> <span suppressHydrationWarning>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => set("es")}>Español</DropdownMenuItem>
        <DropdownMenuItem onClick={() => set("en")}>English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderProfile({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const navigate = useNavigate();
  const isCompany = role === "empresa";
  const profileTo = isCompany ? "/empresa/perfil" : "/inversor/perfil";

  const { data: prof } = useQuery({
    queryKey: ["header_profile", user?.id, role],
    enabled: !!user && !!role && role !== "admin",
    queryFn: async () => {
      if (isCompany) {
        const { data } = await supabase.from("company_profiles")
          .select("legal_name, logo_url").eq("user_id", user!.id).maybeSingle();
        return { name: data?.legal_name, src: data?.logo_url, kind: "company" as const };
      }
      const { data } = await supabase.from("investor_profiles")
        .select("display_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      return { name: data?.display_name, src: data?.avatar_url, kind: "user" as const };
    },
  });

  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.profile")}
          className="flex items-center gap-1.5 rounded-full px-1.5 py-1 hover:bg-muted"
        >
          <EntityAvatar src={prof?.src} name={prof?.name ?? user.email} kind={prof?.kind ?? "user"} size={28} />
          <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
            {prof?.name ?? user.email?.split("@")[0]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => navigate({ to: profileTo })}>
          <UserIcon className="mr-2 h-4 w-4" /> {t("nav.profile")}
        </DropdownMenuItem>
        {role !== "admin" && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/actividad" })}>
            <Activity className="mr-2 h-4 w-4" /> {t("activity.title")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate({ to: "/ajustes" })}>
          <Settings className="mr-2 h-4 w-4" /> {t("nav.settings")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { user, role } = useMyRole();

  const [open, setOpen] = useState(false);
  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const logoTo = user
    ? role === "empresa"
      ? "/empresa"
      : role === "admin"
        ? "/admin"
        : "/inversor"
    : "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={logoTo} aria-label="Capora" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div aria-hidden className="h-8 w-8 rounded-lg gradient-primary shadow-elegant" />
          <span className="text-lg font-semibold tracking-tight">Capora</span>
        </Link>


        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              {role === "admin" && (
                <Link to="/admin" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  {t("nav.admin")}
                </Link>
              )}
              {role === "inversor" && (
                <Link to="/proyectos" className="hidden sm:inline-flex px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  {t("nav.explore")}
                </Link>
              )}
              <NotificationsBell />
              <HeaderProfile onLogout={() => setOpen(true)} />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("logout.title")}</DialogTitle>
                    <DialogDescription>{t("logout.description")}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      {t("logout.cancel")}
                    </Button>
                    <Button onClick={signOut}>
                      {t("logout.confirm")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
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
          <div className="flex flex-wrap gap-4">
            <Link to="/privacidad" className="hover:text-foreground">{t("footer.privacy")}</Link>
            <Link to="/terminos" className="hover:text-foreground">{t("footer.terms")}</Link>
            <Link to="/cookies" className="hover:text-foreground">{t("footer.cookies")}</Link>
            <Link to="/legal" className="hover:text-foreground">{t("footer.legal")}</Link>
            <Link to="/ayuda" className="hover:text-foreground">{t("footer.help")}</Link>
            <Link to="/contacto" className="hover:text-foreground">{t("footer.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
