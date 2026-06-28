import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouterProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth
        const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !user) return new Response("Unauthorized", { status: 401 });

        // Body
        const body = (await request.json()) as {
          agentSlug?: string;
          messages?: UIMessage[];
          contextData?: string;
        };
        if (!body.agentSlug || !Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }

        // Agent
        const { data: agent, error: agentErr } = await supabaseAdmin
          .from("ai_agents")
          .select("id, system_prompt, model")
          .eq("slug", body.agentSlug)
          .eq("enabled", true)
          .maybeSingle();

        if (agentErr) return new Response(`DB error: ${agentErr.message}`, { status: 500 });
        if (!agent) return new Response(`Agent '${body.agentSlug}' not found`, { status: 404 });

        // Knowledge
        const { data: docs } = await supabaseAdmin
          .from("ai_agent_knowledge")
          .select("title, content")
          .eq("agent_id", agent.id)
          .order("sort_order");

        const knowledge = (docs ?? [])
          .map((d, i) => `[Doc ${i + 1}: ${d.title}]\n${d.content}`)
          .join("\n\n---\n\n");

        let system = agent.system_prompt;
        if (knowledge) system += `\n\n=== BASE DE CONHECIMENTO ===\n${knowledge}`;
        if (body.contextData) system += `\n\n=== DADOS PARA ANÁLISE ===\n${body.contextData}`;

        // API key
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return new Response("OPENROUTER_API_KEY not configured", { status: 500 });

        // Stream
        try {
          const gateway = createOpenRouterProvider(apiKey);
          const result = streamText({
            model: gateway(agent.model ?? "google/gemini-2.0-flash-exp:free"),
            system,
            messages: await convertToModelMessages(body.messages),
          });
          return result.toUIMessageStreamResponse({ originalMessages: body.messages });
        } catch (err: any) {
          return new Response(err?.message ?? "Stream error", { status: 500 });
        }
      },
    },
  },
});
