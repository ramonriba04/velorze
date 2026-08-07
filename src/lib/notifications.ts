export type AppNotification = {
  id: string;
  type: string;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

/** Where a notification should take the user when clicked. */
export function notificationLink(n: AppNotification, role: string | null): string {
  switch (n.type) {
    case "contact_request_received":
      return "/empresa/solicitudes";
    case "contact_request_accepted":
    case "contact_request_rejected":
      return "/inversor/solicitudes";
    case "message_received":
      return "/mensajes";
    case "new_match":
      return "/conexiones";
    case "verification_approved":
    case "verification_rejected":
      return "/verificacion";
    case "project_published":
    case "project_reported":
      return "/empresa";
    case "account_warning":
      return "/seguridad";
    default:
      return role === "empresa" ? "/empresa" : "/inversor";
  }
}

export type NotificationGroupKey = "today" | "yesterday" | "earlier";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function groupKeyFor(createdAt: string, now = new Date()): NotificationGroupKey {
  const today = startOfDay(now).getTime();
  const created = startOfDay(new Date(createdAt)).getTime();
  if (created >= today) return "today";
  if (created >= today - 86_400_000) return "yesterday";
  return "earlier";
}

/** Groups notifications into Today / Yesterday / Earlier, preserving order. */
export function groupNotifications(items: AppNotification[]) {
  const groups: { key: NotificationGroupKey; items: AppNotification[] }[] = [
    { key: "today", items: [] },
    { key: "yesterday", items: [] },
    { key: "earlier", items: [] },
  ];
  for (const n of items) {
    const key = groupKeyFor(n.created_at);
    groups.find((g) => g.key === key)!.items.push(n);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function formatNotificationTime(createdAt: string, locale?: string) {
  const d = new Date(createdAt);
  const key = groupKeyFor(createdAt);
  if (key === "today") {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
