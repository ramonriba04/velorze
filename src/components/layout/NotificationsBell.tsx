import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  type AppNotification, groupNotifications, notificationLink, formatNotificationTime,
} from "@/lib/notifications";

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const { user, role } = useMyRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, payload, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as AppNotification[];
    },
  });

  const unread = notifications?.filter((n) => !n.read_at) ?? [];
  const groups = groupNotifications(notifications ?? []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0 || !user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative min-h-11 min-w-11"
          aria-label={unread.length > 0
            ? `${t("notifications.title")} — ${t("notifications.unreadCount", { count: unread.length })}`
            : t("notifications.title")}
        >
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t("notifications.title")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {unread.length > 0
                ? t("notifications.unreadCount", { count: unread.length })
                : t("notifications.allRead")}
            </p>
          </div>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-xs"
              onClick={() => markRead(unread.map((n) => n.id))}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">{t("empty.notifications")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("empty.notificationsSub")}</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <p className="bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`notifications.groups.${g.key}`)}
                </p>
                <ul className="divide-y">
                  {g.items.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={notificationLink(n, role) as any}
                        onClick={() => { setOpen(false); if (!n.read_at) markRead([n.id]); }}
                        className={`block px-3 py-2.5 hover:bg-muted ${!n.read_at ? "bg-primary/5" : ""}`}
                      >
                        <p className="text-sm">
                          {t(`notifications.types.${n.type}`, t("notifications.types.default"))}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatNotificationTime(n.created_at, i18n.resolvedLanguage)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Link to="/notificaciones" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              {t("notifications.viewAll")}
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
