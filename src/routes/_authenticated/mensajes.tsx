import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage, respondContactRequest } from "@/lib/contact.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Handshake, MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

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
          <ChatsPanel userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function ChatsPanel({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const send = useServerFn(sendMessage);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: convs } = useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, projects(title)")
        .order("created_at", { ascending: false });
      return data ?? [];
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

  useEffect(() => {
    if (!active) return;
    const channel = supabase.channel(`msg:${active}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, refetch]);

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    await send({ data: { conversation_id: active, body: text.trim() } });
    setText("");
    refetch();
  };

  if (!convs || convs.length === 0) {
    return <EmptyState icon={<MessagesSquare />} title={t("empty.messages")} description={t("empty.messagesSub")} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <Card className="p-2 max-h-[60vh] overflow-y-auto">
        {convs.map((c: any) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm ${active === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          >
            <p className="font-medium truncate">{c.projects?.title ?? t("messages.title")}</p>
            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
          </button>
        ))}
      </Card>
      <Card className="flex flex-col h-[60vh]">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t("messages.selectHint")}</div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages?.map((m: any) => (
                <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                </div>
              ))}
            </div>
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
