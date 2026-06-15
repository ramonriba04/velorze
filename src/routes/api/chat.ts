import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { loadChatContext, buildSystemPrompt } from "@/lib/chat-context.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          messages?: UIMessage[];
          locale?: "es" | "en";
        };
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const locale = body.locale === "en" ? "en" : "es";

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const ctx = await loadChatContext(request.headers.get("authorization"));
        const system = buildSystemPrompt(ctx, locale);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          console.error("[chat]", err);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});
