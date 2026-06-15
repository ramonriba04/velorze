import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function getText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

export default function CaporaAssistant() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const locale = i18n.language?.startsWith("en") ? "en" : "es";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setToken(s?.access_token ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: { locale },
  });

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  const placeholder = locale === "es"
    ? "Pregunta algo... (ej. ¿Por qué este proyecto coincide?)"
    : "Ask me anything... (e.g. Why does this project match?)";
  const title = locale === "es" ? "Capora Assistant" : "Capora Assistant";
  const subtitle = locale === "es" ? "Descubre oportunidades mejor." : "Discover opportunities smarter.";
  const disclaimer = locale === "es"
    ? "Información meramente informativa, no es asesoramiento financiero."
    : "Informational only — not financial advice.";
  const empty = locale === "es"
    ? "Hola 👋 Soy tu asistente de Capora. ¿En qué te puedo ayudar?"
    : "Hi 👋 I'm your Capora assistant. How can I help?";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={title}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(600px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs opacity-80">{subtitle}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted p-3 text-muted-foreground">{empty}</div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                    : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-foreground"
                }
              >
                {getText(m)}
              </div>
            ))}
            {status === "submitted" && (
              <div className="mr-auto flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">...</span>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error.message || "Error"}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-tight text-muted-foreground">{disclaimer}</p>
          </form>
        </div>
      )}
      {/* keep t in scope for future i18n use */}
      <span className="hidden">{t}</span>
    </>
  );
}
