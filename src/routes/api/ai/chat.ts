import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouterProvider } from "@/lib/ai-gateway.server";
import { getEnvVar } from "@/lib/cloudflare-context";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Wrap everything so ANY crash returns readable text ──
        try {
          // Step 1: token
          const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
          if (!token) return new Response("[1] Unauthorized: no token", { status: 401 });

          // Step 2: validate token via Supabase Admin
          let userId: string;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
            if (authErr || !user) return new Response(`[2] Auth failed: ${authErr?.message ?? "no user"}`, { status: 401 });
            userId = user.id;
          } catch (e: any) {
            return new Response(`[2] Auth crash: ${e?.message}`, { status: 500 });
          }

          // Step 3: parse body
          let body: { agentSlug?: string; messages?: UIMessage[]; contextData?: string };
          try {
            body = await request.json() as typeof body;
          } catch (e: any) {
            return new Response(`[3] Body parse error: ${e?.message}`, { status: 400 });
          }
          if (!body.agentSlug || !Array.isArray(body.messages)) {
            return new Response(`[3] Bad request: missing agentSlug or messages`, { status: 400 });
          }

          // Step 4: fetch agent from DB
          let agent: { id: string; system_prompt: string; model: string } | null = null;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data, error: agentErr } = await supabaseAdmin
              .from("ai_agents")
              .select("id, system_prompt, model")
              .eq("slug", body.agentSlug)
              .eq("enabled", true)
              .maybeSingle();
            if (agentErr) return new Response(`[4] DB error: ${agentErr.message}`, { status: 500 });
            agent = data;
          } catch (e: any) {
            return new Response(`[4] Agent fetch crash: ${e?.message}`, { status: 500 });
          }
          if (!agent) return new Response(`[4] Agent '${body.agentSlug}' not found`, { status: 404 });

          // Step 5: knowledge docs
          let system = agent.system_prompt;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: docs } = await supabaseAdmin
              .from("ai_agent_knowledge")
              .select("title, content")
              .eq("agent_id", agent.id)
              .order("sort_order");
            const knowledge = (docs ?? [])
              .map((d, i) => `[Doc ${i + 1}: ${d.title}]\n${d.content}`)
              .join("\n\n---\n\n");
            if (knowledge) system += `\n\n=== BASE DE CONHECIMENTO ===\n${knowledge}`;
          } catch { /* non-fatal */ }
          if (body.contextData) system += `\n\n=== DADOS PARA ANÁLISE ===\n${body.contextData}`;

          // Step 6: check API key
          const apiKey = getEnvVar("OPENROUTER_API_KEY");
          if (!apiKey) return new Response("[6] OPENROUTER_API_KEY not configured", { status: 500 });

          // Step 7: stream
          try {
            const gateway = createOpenRouterProvider(apiKey);
            const result = streamText({
              model: gateway(agent.model ?? "google/gemini-2.5-flash:free"),
              system,
              messages: await convertToModelMessages(body.messages),
            });
            return result.toUIMessageStreamResponse({
              originalMessages: body.messages,
              onError: (error: unknown) => error instanceof Error ? error.message : String(error),
            });
          } catch (e: any) {
            return new Response(`[7] Stream error: ${e?.message}`, { status: 500 });
          }

        } catch (e: any) {
          return new Response(`[0] Unhandled crash: ${e?.message}`, { status: 500 });
        }
      },
    },
  },
});
