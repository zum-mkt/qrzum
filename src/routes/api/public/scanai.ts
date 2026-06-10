import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/public/scanai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          shortId?: string;
          sessionId?: string;
          locale?: string;
          messages?: UIMessage[];
        };
        if (!body.shortId || !body.sessionId || !Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin.from("qr_links")
          .select("id, title").eq("short_id", body.shortId).maybeSingle();
        if (!link) return new Response("Not found", { status: 404 });
        const { data: docs } = await supabaseAdmin.from("qr_knowledge")
          .select("title, content, source_url").eq("qr_id", link.id);

        const knowledge = (docs ?? []).map((d, i) =>
          `[Doc ${i + 1}: ${d.title}${d.source_url ? ` (${d.source_url})` : ""}]\n${d.content}`
        ).join("\n\n---\n\n");

        const locale = body.locale || "pt-BR";
        const system = `Você é o assistente do item "${link.title}". Responda SEMPRE no idioma com tag BCP-47 "${locale}". Use APENAS o conteúdo abaixo como fonte. Se a resposta não estiver nele, diga que não tem essa informação.\n\n=== BASE DE CONHECIMENTO ===\n${knowledge || "(vazio)"}`;

        // Persist last user message
        const lastUser = [...body.messages].reverse().find(m => m.role === "user");
        const userText = lastUser ? lastUser.parts.map(p => p.type === "text" ? p.text : "").join("") : "";
        if (userText) {
          await supabaseAdmin.from("scanai_messages").insert({
            qr_id: link.id, session_id: body.sessionId, role: "user", content: userText,
          });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ responseMessage }) => {
            const text = responseMessage.parts.map(p => p.type === "text" ? p.text : "").join("");
            if (text) {
              await supabaseAdmin.from("scanai_messages").insert({
                qr_id: link.id, session_id: body.sessionId!, role: "assistant", content: text,
              });
            }
          },
        });
      },
    },
  },
});