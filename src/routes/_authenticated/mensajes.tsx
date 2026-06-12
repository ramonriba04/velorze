import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage } from "@/lib/contact.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/mensajes")({
  component: Messages,
});

function Messages() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const send = useServerFn(sendMessage);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: convs } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
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
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", active!)
        .order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`msg:${active}`)
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("messages.title")}</h1>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="p-2 max-h-[60vh] overflow-y-auto">
          {convs?.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("messages.empty")}</p>}
          {convs?.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${active === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            >
              <p className="font-medium truncate">{c.projects?.title ?? "Conversación"}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </Card>
        <Card className="flex flex-col h-[60vh]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">←</div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages?.map((m: any) => (
                  <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
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
    </div>
  );
}
