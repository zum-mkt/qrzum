import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveModel, buildFallbackChain, isQuotaError } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Step 1: token
          const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
          if (!token) return new Response("[1] Unauthorized: no token", { status: 401 });

          // Step 2: validate token
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
            return new Response("[3] Bad request: missing agentSlug or messages", { status: 400 });
          }

          // Step 4: fetch agent
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
          if (!agent.model) return new Response("[4] Modelo não configurado. Acesse Admin → IAs.", { status: 500 });

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

          // Step 6: stream with automatic quota fallback
          const messages = await convertToModelMessages(body.messages);
          const fallbackChain = buildFallbackChain(agent.model);

          for (let attempt = 0; attempt < fallbackChain.length; attempt++) {
            const modelId = fallbackChain[attempt];
            const isLast = attempt === fallbackChain.length - 1;

            let model;
            try {
              model = resolveModel(modelId);
            } catch {
              // API key not configured for this provider — skip silently
              if (!isLast) continue;
              return new Response(
                "[6] Nenhum provider disponível. Adicione GEMINI_API_KEY ou GROQ_API_KEY no Cloudflare.",
                { status: 500 }
              );
            }

            const result = streamText({ model, system, messages });

            // Last model in chain: commit immediately, show errors in UI
            if (isLast) {
              return result.toUIMessageStreamResponse({
                originalMessages: body.messages,
                onError: (error) => error instanceof Error ? error.message : String(error),
              });
            }

            // Non-last: tee the stream to peek at the first chunk for quota errors.
            // If quota error detected before any real data → try next model silently.
            const innerResponse = result.toUIMessageStreamResponse({
              originalMessages: body.messages,
              onError: (error) => error instanceof Error ? error.message : String(error),
            });

            const [probeStream, mainStream] = innerResponse.body!.tee();
            const reader = probeStream.getReader();

            try {
              const { value, done } = await reader.read();
              reader.cancel().catch(() => {});

              if (!done && value && isQuotaError(new TextDecoder().decode(value))) {
                mainStream.cancel().catch(() => {});
                continue; // quota error in first chunk → try next model
              }

              // First chunk is clean — return the full response via mainStream (tee keeps all data)
              return new Response(mainStream, {
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "X-Vercel-AI-Data-Stream": "v1",
                },
              });
            } catch {
              mainStream.cancel().catch(() => {});
              if (!isLast) continue;
            }
          }

          return new Response("[6] Todos os modelos gratuitos estão indisponíveis.", { status: 503 });

        } catch (e: any) {
          return new Response(`[0] Unhandled crash: ${e?.message}`, { status: 500 });
        }
      },
    },
  },
});
