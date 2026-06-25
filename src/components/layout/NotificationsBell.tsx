import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

function notificationLink(n: Notification, role: string | null): { to: string } {
  switch (n.type) {
    case "contact_request_received":
      return { to: "/empresa/solicitudes" };
    case "contact_request_accepted":
    case "contact_request_rejected":
      return { to: "/inversor/solicitudes" };
    case "message_received":
      return { to: "/mensajes" };
    default:
      return { to: role === "empresa" ? "/empresa" : "/inversor" };
  }
}

export function NotificationsBell() {
  const { t } = useTranslation();
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
      return (data ?? []) as Notification[];
    },
  });

  const unread = notifications?.filter((n) => !n.read_at) ?? [];

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (!open || unread.length === 0 || !user) return;
    const ids = unread.map((n) => n.id);
    (async () => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    })();
  }, [open, unread.length, user, qc]);

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={t("notifications.title")}>
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {notifications && notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">{notifications.length}</span>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">{t("empty.notifications")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("empty.notificationsSub")}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const link = notificationLink(n, role);
                return (
                  <li key={n.id}>
                    <Link
                      to={link.to as any}
                      onClick={() => setOpen(false)}
                      className={`block px-3 py-2.5 hover:bg-muted ${!n.read_at ? "bg-primary/5" : ""}`}
                    >
                      <p className="text-sm">{t(`notifications.types.${n.type}`, t("notifications.types.default"))}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
