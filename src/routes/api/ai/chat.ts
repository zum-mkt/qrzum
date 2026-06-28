import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createOpenRouterProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Auth
          const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
          if (!token) return new Response("Unauthorized", { status: 401 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
          if (authErr || !user) return new Response("Unauthorized", { status: 401 });

          // Parse body
          const body = await request.json() as {
            agentSlug?: string;
            messages?: Array<{ role: string; content?: string; parts?: Array<{ type: string; text?: string }> }>;
            contextData?: string;
          };

          if (!body.agentSlug || !Array.isArray(body.messages)) {
            return new Response("Bad request", { status: 400 });
          }

          // Fetch agent
          const { data: agent, error: agentErr } = await supabaseAdmin
            .from("ai_agents")
            .select("id, name, system_prompt, model, enabled")
            .eq("slug", body.agentSlug)
            .eq("enabled", true)
            .maybeSingle();

          if (agentErr) return new Response(`DB error: ${agentErr.message}`, { status: 500 });
          if (!agent) return new Response(`Agent '${body.agentSlug}' not found`, { status: 404 });

          // Fetch knowledge
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

          // Validate API key
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) return new Response("OPENROUTER_API_KEY not configured", { status: 500 });

          // Convert UIMessages → CoreMessages (handle both .content and .parts formats)
          const messages = body.messages
            .map((m) => {
              const role = m.role === "user" || m.role === "assistant" ? m.role : null;
              if (!role) return null;
              const text = m.parts
                ? m.parts.filter(p => p.type === "text").map(p => p.text ?? "").join("")
                : (m.content ?? "");
              return text ? { role, content: text } : null;
            })
            .filter((m): m is { role: "user" | "assistant"; content: string } => m !== null);

          if (messages.length === 0) {
            return new Response("No messages to process", { status: 400 });
          }

          // Stream
          const gateway = createOpenRouterProvider(apiKey);
          const result = streamText({
            model: gateway(agent.model ?? "google/gemini-2.0-flash-exp:free"),
            system,
            messages,
          });

          return result.toDataStreamResponse();
        } catch (err: any) {
          console.error("[/api/ai/chat]", err);
          return new Response(err?.message ?? "Internal server error", { status: 500 });
        }
      },
    },
  },
});
