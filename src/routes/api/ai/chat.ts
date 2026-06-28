import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouterProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require authenticated user
        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Validate JWT
        const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as {
          agentSlug?: string;
          messages?: UIMessage[];
          contextData?: string;
        };

        if (!body.agentSlug || !Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }

        // Fetch agent config
        const { data: agent } = await supabaseAdmin
          .from("ai_agents")
          .select("*")
          .eq("slug", body.agentSlug)
          .eq("enabled", true)
          .maybeSingle();

        if (!agent) return new Response("Agent not found or disabled", { status: 404 });

        // Fetch knowledge docs
        const { data: docs } = await supabaseAdmin
          .from("ai_agent_knowledge")
          .select("title, content")
          .eq("agent_id", agent.id)
          .order("sort_order");

        const knowledge = (docs ?? []).map((d, i) =>
          `[Doc ${i + 1}: ${d.title}]\n${d.content}`
        ).join("\n\n---\n\n");

        let system = agent.system_prompt;
        if (knowledge) system += `\n\n=== BASE DE CONHECIMENTO ===\n${knowledge}`;
        if (body.contextData) system += `\n\n=== DADOS PARA ANÁLISE ===\n${body.contextData}`;

        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

        const gateway = createOpenRouterProvider(key);
        const result = streamText({
          model: gateway(agent.model || "google/gemini-2.0-flash-exp:free"),
          system,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
