import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState, useRef } from "react";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage, respondContactRequest, markMessagesRead } from "@/lib/contact.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Handshake, MessagesSquare, Check, CheckCheck, ImageOff, MoreVertical, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityAvatar } from "@/components/media/EntityAvatar";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { BlockUserDialog } from "@/components/moderation/BlockUserDialog";
import { SecurityNoticeCard } from "@/components/moderation/SecurityNoticeCard";
import { detectSecurityPatterns } from "@/lib/security-patterns";

export const Route = createFileRoute("/_authenticated/mensajes")({
  head: () => ({ meta: [{ title: "Messages | Capora" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Messages,
});

function Messages() {
  const { t } = useTranslation();
  const { user, role } = useMyRole();
  const isCompany = role === "empresa";
  const qc = useQueryClient();
  const respond = useServerFn(respondContactRequest);

  const reqQuery = useQuery({
    queryKey: ["contact_requests", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async () => {
      const col = isCompany ? "company_id" : "investor_id";
      const { data } = await supabase
        .from("contact_requests")
        .select("*, projects(title)")
        .eq(col, user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const pending = (reqQuery.data ?? []).filter((r: any) => r.status === "pending");
  const accepted = (reqQuery.data ?? []).filter((r: any) => r.status === "accepted");

  const respondMut = useMutation({
    mutationFn: (v: { id: string; status: "accepted" | "rejected" }) => respond({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact_requests"] }); toast.success(t("common.saved")); },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28">
      <h1 className="text-3xl font-bold mb-6">{t("messages.title")}</h1>

      <Tabs defaultValue="chats">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="pending" className="gap-1">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">{t("messages.pending")}</span>
            {pending.length > 0 && <Badge variant="secondary" className="ml-1 h-5">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-1">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">{t("messages.accepted")}</span>
          </TabsTrigger>
          <TabsTrigger value="chats" className="gap-1">
            <MessagesSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t("messages.chats")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 && (
            <EmptyState icon={<Inbox />} title={t("messages.pendingEmpty")} description={t("empty.messagesSub")} />
          )}
          {pending.map((r: any) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.projects?.title ?? "—"}</p>
                  {r.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {isCompany ? (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => respondMut.mutate({ id: r.id, status: "accepted" })}>{t("requests.accept")}</Button>
                    <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: r.id, status: "rejected" })}>{t("requests.reject")}</Button>
                  </div>
                ) : (
                  <Badge variant="outline">{t("requests.pending")}</Badge>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="accepted" className="mt-4 space-y-3">
          {accepted.length === 0 && (
            <EmptyState icon={<Handshake />} title={t("messages.acceptedEmpty")} description={t("empty.messagesSub")} />
          )}
          {accepted.map((r: any) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{r.projects?.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge>{t("requests.accepted")}</Badge>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="chats" className="mt-4">
          <ChatsPanel userId={user?.id} isCompany={isCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- helpers ---------- */

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayLabel(d: Date, t: (k: string) => string) {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return t("chat.today");
  if (isSameDay(d, yesterday)) return t("chat.yesterday");
  return d.toLocaleDateString();
}
function timeShort(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------- chats panel ---------- */

function ChatsPanel({ userId, isCompany }: { userId?: string; isCompany: boolean }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markMessagesRead);
  const listRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: convs } = useQuery({
    queryKey: ["conversations_rich", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: cs } = await supabase
        .from("conversations")
        .select("*, projects(id, title, cover_url)")
        .order("created_at", { ascending: false });
      const conversations = cs ?? [];
      if (conversations.length === 0) return [];

      const otherIds = Array.from(new Set(conversations.map((c: any) => isCompany ? c.investor_id : c.company_id)));
      const projectIds = Array.from(new Set(conversations.map((c: any) => c.project_id).filter(Boolean)));
      const convIds = conversations.map((c: any) => c.id);

      const [{ data: companies }, { data: investors }, { data: profiles }, { data: images }, { data: msgs }, { data: blocks }] = await Promise.all([
        supabase.from("company_profiles").select("user_id, legal_name, logo_url, verification_status, trust_level").in("user_id", otherIds),
        supabase.from("investor_profiles").select("user_id, display_name, avatar_url").in("user_id", otherIds),
        supabase.from("profiles").select("id, full_name, avatar_url, suspended_at").in("id", otherIds),
        supabase.from("project_images").select("project_id, url, sort_order").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]).order("sort_order"),
        supabase.from("messages").select("id, conversation_id, body, sender_id, created_at, read_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(500),
        supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId!),
      ]);
      const blockedSet = new Set((blocks ?? []).map((b: any) => b.blocked_id));

      const cMap: Record<string, any> = {}; (companies ?? []).forEach((c: any) => cMap[c.user_id] = c);
      const iMap: Record<string, any> = {}; (investors ?? []).forEach((i: any) => iMap[i.user_id] = i);
      const pMap: Record<string, any> = {}; (profiles ?? []).forEach((p: any) => pMap[p.id] = p);
      const thumbMap: Record<string, string> = {};
      (images ?? []).forEach((i: any) => { if (!thumbMap[i.project_id]) thumbMap[i.project_id] = i.url; });
      const lastMsg: Record<string, any> = {};
      const unread: Record<string, number> = {};
      (msgs ?? []).forEach((m: any) => {
        if (!lastMsg[m.conversation_id]) lastMsg[m.conversation_id] = m;
        if (m.sender_id !== userId && !m.read_at) {
          unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
        }
      });

      return conversations
        .filter((c: any) => !blockedSet.has(isCompany ? c.investor_id : c.company_id))
        .map((c: any) => {
        const otherId = isCompany ? c.investor_id : c.company_id;
        const other = isCompany
          ? (iMap[otherId] ?? null)
          : (cMap[otherId] ?? null);
        const otherName = isCompany
          ? (other?.display_name ?? pMap[otherId]?.full_name ?? "—")
          : (other?.legal_name ?? pMap[otherId]?.full_name ?? "—");
        const otherAvatar = isCompany
          ? (other?.avatar_url ?? pMap[otherId]?.avatar_url ?? null)
          : (other?.logo_url ?? null);
        const thumb = c.project_id ? (thumbMap[c.project_id] ?? c.projects?.cover_url ?? null) : null;
        const otherVerified = !isCompany && cMap[otherId]?.verification_status === "verified";
        return {
          ...c,
          otherId,
          otherName,
          otherAvatar,
          otherKind: isCompany ? "user" as const : "company" as const,
          otherVerified,
          otherSuspended: !!pMap[otherId]?.suspended_at,
          thumb,
          lastMessage: lastMsg[c.id] ?? null,
          unreadCount: unread[c.id] ?? 0,
        };
      }).sort((a: any, b: any) => {
        const ta = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
        const tb = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
        return tb - ta;
      });
    },
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", active],
    enabled: !!active,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*")
        .eq("conversation_id", active!).order("created_at");
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!active) return;
    const channel = supabase.channel(`msg:${active}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${active}` }, () => {
        refetch();
        qc.invalidateQueries({ queryKey: ["conversations_rich"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, refetch, qc]);

  // Auto-scroll
  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [messages]);

  // Mark as read on open / new messages
  useEffect(() => {
    if (!active || !userId) return;
    const hasUnread = (messages ?? []).some((m: any) => m.sender_id !== userId && !m.read_at);
    if (!hasUnread) return;
    markRead({ data: { conversation_id: active } })
      .then(() => qc.invalidateQueries({ queryKey: ["conversations_rich"] }))
      .catch(() => {});
  }, [active, messages, userId, markRead, qc]);

  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: any[] }> = [];
    (messages ?? []).forEach((m: any) => {
      const d = new Date(m.created_at);
      const label = dayLabel(d, t);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [m] });
      else last.items.push(m);
    });
    return groups;
  }, [messages, t]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    try {
      await send({ data: { conversation_id: active, body: text.trim() } });
      setText("");
      refetch();
      qc.invalidateQueries({ queryKey: ["conversations_rich"] });
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (/blocked|sender_blocked_by_recipient|recipient_has_blocked/i.test(msg)) {
        toast.error(t("safety.block.sendBlocked"));
      } else {
        toast.error(t("common.error"));
      }
    }
  };

  const activeConv = (convs ?? []).find((c: any) => c.id === active);
  const lastIncoming = [...(messages ?? [])].reverse().find((m: any) => m.sender_id !== userId);
  const secHits = lastIncoming ? detectSecurityPatterns(lastIncoming.body ?? "") : [];

  if (!convs || convs.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare />}
        title={t("empty.messages")}
        description={t("empty.messagesSub")}
        ctaLabel={t("empty.startConnection")}
        ctaTo="/descubrir"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <Card className="p-0 max-h-[65vh] overflow-y-auto divide-y">
        {convs.map((c: any) => {
          const isActive = active === c.id;
          const ts = c.lastMessage ? new Date(c.lastMessage.created_at) : new Date(c.created_at);
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`w-full text-left px-3 py-3 flex gap-3 items-start ${isActive ? "bg-primary/10" : "hover:bg-muted"}`}
            >
              <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {c.thumb ? (
                  <img src={c.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.projects?.title ?? t("messages.title")}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeShort(ts)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <EntityAvatar src={c.otherAvatar} name={c.otherName} kind={c.otherKind} size={14} />
                  <p className="text-[11px] text-muted-foreground truncate">{c.otherName}</p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {c.lastMessage?.body ?? t("messages.noMessagesYet")}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </Card>

      <Card className="flex flex-col h-[65vh]">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t("messages.selectHint")}</div>
        ) : (
          <>
            {activeConv && (
              <div className="border-b px-3 py-2 flex items-center gap-2">
                <EntityAvatar src={activeConv.otherAvatar} name={activeConv.otherName} kind={activeConv.otherKind} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{activeConv.otherName}</p>
                    {activeConv.otherVerified && (
                      <span title={t("safety.notice.verified")} className="inline-flex items-center text-emerald-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  {activeConv.projects?.title && (
                    <p className="text-[11px] text-muted-foreground truncate">{activeConv.projects.title}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={"More options"}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ReportDialog
                      kind="user"
                      userId={activeConv.otherId}
                      displayName={activeConv.otherName}
                      trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t("safety.report.userAction")}</DropdownMenuItem>}
                    />
                    <BlockUserDialog
                      userId={activeConv.otherId}
                      displayName={activeConv.otherName}
                      onBlocked={() => { setActive(null); qc.invalidateQueries({ queryKey: ["conversations_rich"] }); }}
                      trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t("safety.block.action")}</DropdownMenuItem>}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {grouped.map((g) => (
                <div key={g.label} className="space-y-1.5">
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {g.label}
                    </span>
                  </div>
                  {g.items.map((m: any) => {
                    const mine = m.sender_id === userId;
                    const ts = new Date(m.created_at);
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div>{m.body}</div>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            <span>{timeShort(ts)}</span>
                            {mine && (
                              m.read_at
                                ? <CheckCheck className="h-3 w-3" />
                                : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {secHits.length > 0 && activeConv && (
              <div className="px-3">
                <SecurityNoticeCard
                  hits={secHits}
                  senderId={activeConv.otherId}
                  senderName={activeConv.otherName}
                  senderVerified={!!activeConv.otherVerified}
                />
              </div>
            )}
            <form onSubmit={onSend} className="border-t p-3 flex gap-2">
              <Input placeholder={t("messages.writePlaceholder")} value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit">{t("common.send")}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
