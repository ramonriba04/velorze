import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AppNotification, groupNotifications, notificationLink, formatNotificationTime,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones | Velorze" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { user, role } = useMyRole();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, payload, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
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
    qc.invalidateQueries({ queryKey: ["notifications-all", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {t("notifications.center")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread.length > 0
              ? t("notifications.unreadCount", { count: unread.length })
              : t("notifications.centerSub")}
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => markRead(unread.map((n) => n.id))}
          >
            <CheckCheck className="h-4 w-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </header>

      {isLoading ? (
        <Card className="divide-y p-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </Card>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t("empty.notifications")}</p>
          <p className="text-sm text-muted-foreground">{t("empty.notificationsSub")}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`notifications.groups.${g.key}`)}
              </h2>
              <Card className="divide-y p-0">
                {g.items.map((n) => (
                  <Link
                    key={n.id}
                    to={notificationLink(n, role) as any}
                    onClick={() => { if (!n.read_at) markRead([n.id]); }}
                    className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3 transition-colors hover:bg-muted ${!n.read_at ? "bg-primary/5" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? "bg-primary" : "bg-transparent"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm">
                        {t(`notifications.types.${n.type}`, t("notifications.types.default"))}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatNotificationTime(n.created_at, i18n.resolvedLanguage)}
                      </span>
                    </span>
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}

      <div className="text-sm">
        <Link to="/ajustes" className="text-muted-foreground hover:text-foreground">
          {t("notifPrefs.title")} →
        </Link>
      </div>
    </div>
  );
}
