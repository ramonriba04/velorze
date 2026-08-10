import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Activity,
  Heart,
  MessageCircle,
  Handshake,
  Send,
  Rocket,
  PencilLine,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { groupActivity, type ActivityItem, type ActivityKind } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/actividad")({
  head: () => ({
    meta: [{ title: "Actividad | Velorze" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ActivityHistory,
});

const ICONS: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  project_created: Rocket,
  project_updated: PencilLine,
  verification_approved: ShieldCheck,
  contact_request_received: Send,
  contact_request_sent: Send,
  new_match: Handshake,
  new_message: MessageCircle,
  favorite_added: Heart,
  profile_updated: UserCog,
};

function ActivityHistory() {
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const isCompany = role === "empresa";

  const { data, isLoading } = useQuery({
    queryKey: ["activity_history", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = [];
      const uid = user!.id;

      const [conns, convs] = await Promise.all([
        supabase
          .from("connections")
          .select("id, status, updated_at, investor_id, company_id")
          .eq("status", "conectado")
          .or(`investor_id.eq.${uid},company_id.eq.${uid}`)
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("conversations")
          .select("id, project_id, projects(title)")
          .limit(50),
      ]);

      (conns.data ?? []).forEach((c: any) => {
        items.push({ id: `match-${c.id}`, kind: "new_match", at: c.updated_at });
      });

      const convIds = (convs.data ?? []).map((c: any) => c.id);
      const convTitle: Record<string, string | null> = {};
      (convs.data ?? []).forEach((c: any) => (convTitle[c.id] = c.projects?.title ?? null));

      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, created_at")
          .in("conversation_id", convIds)
          .neq("sender_id", uid)
          .order("created_at", { ascending: false })
          .limit(50);
        (msgs ?? []).forEach((m: any) => {
          items.push({
            id: `msg-${m.id}`,
            kind: "new_message",
            at: m.created_at,
            subject: convTitle[m.conversation_id] ?? null,
          });
        });
      }

      if (isCompany) {
        const [projects, verifications, requests] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, created_at, updated_at")
            .eq("company_id", uid)
            .order("updated_at", { ascending: false })
            .limit(50),
          supabase
            .from("verification_requests")
            .select("id, status, reviewed_at, updated_at")
            .eq("user_id", uid)
            .eq("status", "verified")
            .limit(10),
          supabase
            .from("contact_requests")
            .select("id, created_at, projects(title)")
            .eq("company_id", uid)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        (projects.data ?? []).forEach((p: any) => {
          items.push({ id: `pc-${p.id}`, kind: "project_created", at: p.created_at, subject: p.title });
          if (p.updated_at && p.updated_at !== p.created_at) {
            items.push({ id: `pu-${p.id}`, kind: "project_updated", at: p.updated_at, subject: p.title });
          }
        });
        (verifications.data ?? []).forEach((v: any) => {
          items.push({
            id: `ver-${v.id}`,
            kind: "verification_approved",
            at: v.reviewed_at ?? v.updated_at,
          });
        });
        (requests.data ?? []).forEach((r: any) => {
          items.push({
            id: `crr-${r.id}`,
            kind: "contact_request_received",
            at: r.created_at,
            subject: r.projects?.title ?? null,
          });
        });
      } else {
        const [favs, requests, profile] = await Promise.all([
          supabase
            .from("favorites")
            .select("id, created_at, projects(title)")
            .eq("investor_id", uid)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("contact_requests")
            .select("id, created_at, projects(title)")
            .eq("investor_id", uid)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("investor_profiles").select("updated_at").eq("user_id", uid).maybeSingle(),
        ]);

        (favs.data ?? []).forEach((f: any) => {
          items.push({
            id: `fav-${f.id}`,
            kind: "favorite_added",
            at: f.created_at,
            subject: f.projects?.title ?? null,
          });
        });
        (requests.data ?? []).forEach((r: any) => {
          items.push({
            id: `crs-${r.id}`,
            kind: "contact_request_sent",
            at: r.created_at,
            subject: r.projects?.title ?? null,
          });
        });
        if (profile.data?.updated_at) {
          items.push({ id: "prof", kind: "profile_updated", at: profile.data.updated_at });
        }
      }

      return items;
    },
  });

  const groups = groupActivity(data ?? []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2">
        <Activity aria-hidden className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold sm:text-3xl">{t("activity.title")}</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("activity.subtitle")}</p>

      <div className="mt-6 space-y-8">
        {isLoading && <ListSkeleton count={5} withAvatar={false} />}
        {!isLoading && groups.length === 0 && (
          <EmptyState
            icon={<Activity />}
            title={t("activity.empty")}
            description={t("activity.emptySub")}
          />
        )}
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`notifications.group.${g.key}`)}
            </h2>
            <Card className="divide-y p-0">
              {g.items.map((item) => {
                const Icon = ICONS[item.kind];
                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon aria-hidden className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{t(`activity.kind.${item.kind}`)}</p>
                      {item.subject && (
                        <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                      )}
                    </div>
                    <time
                      dateTime={item.at}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    >
                      {new Date(item.at).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                );
              })}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
