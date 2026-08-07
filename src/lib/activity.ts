export type ActivityKind =
  | "project_created"
  | "project_updated"
  | "verification_approved"
  | "contact_request_received"
  | "contact_request_sent"
  | "new_match"
  | "new_message"
  | "favorite_added"
  | "profile_updated";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  /** Free-form subject, e.g. a project title or a counterpart name. */
  subject?: string | null;
  to?: string | null;
};

export type ActivityGroupKey = "today" | "yesterday" | "earlier";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function activityGroupKey(at: string, now = new Date()): ActivityGroupKey {
  const today = startOfDay(now).getTime();
  const created = startOfDay(new Date(at)).getTime();
  if (created >= today) return "today";
  if (created >= today - 86_400_000) return "yesterday";
  return "earlier";
}

/** Sorts newest-first and buckets into Today / Yesterday / Earlier. */
export function groupActivity(items: ActivityItem[]) {
  const sorted = [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const groups: { key: ActivityGroupKey; items: ActivityItem[] }[] = [
    { key: "today", items: [] },
    { key: "yesterday", items: [] },
    { key: "earlier", items: [] },
  ];
  for (const item of sorted) {
    groups.find((g) => g.key === activityGroupKey(item.at))!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}
