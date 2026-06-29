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

          // Step 7: resolve a working model then stream
          if (!agent.model) return new Response("[7] Modelo não configurado. Acesse Admin → IAs.", { status: 500 });

          // Build candidate list: configured model first, then other free text models from OpenRouter
          let candidates: string[] = [agent.model];
          try {
            const orRes = await fetch("https://openrouter.ai/api/v1/models");
            if (orRes.ok) {
              type ORModel = { id: string; architecture?: { modality?: string } };
              const orJson = await orRes.json() as { data: ORModel[] };
              const freeText = orJson.data
                .filter(m => m.id.endsWith(":free") && (m.architecture?.modality ?? "text").includes("text"))
                .map(m => m.id);
              // Put configured model first if present, then others as fallbacks
              const others = freeText.filter(id => id !== agent.model);
              candidates = freeText.includes(agent.model)
                ? [agent.model, ...others]
                : [...others]; // configured model removed from list — skip it
            }
          } catch { /* non-fatal */ }

          if (candidates.length === 0) {
            return new Response("[7] Nenhum modelo gratuito disponível no OpenRouter no momento.", { status: 503 });
          }

          // Test each candidate with a 1-token probe until one responds
          const gateway = createOpenRouterProvider(apiKey);
          let resolvedModel = candidates[0];
          for (const candidate of candidates) {
            try {
              const probe = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                  "HTTP-Referer": "https://qrzum.com",
                  "X-Title": "QRzum",
                },
                body: JSON.stringify({
                  model: candidate,
                  messages: [{ role: "user", content: "ping" }],
                  max_tokens: 1,
                  stream: false,
                }),
              });
              if (probe.ok) {
                resolvedModel = candidate;
                break;
              }
              const err = await probe.json().catch(() => ({})) as { error?: { message?: string } };
              const msg = err?.error?.message ?? "";
              // Hard stop if it's clearly not free anymore (not a transient error)
              if (msg.includes("unavailable for free") || msg.includes("no endpoints")) continue;
              // Transient errors (rate limit, overload) — still try this model for the real stream
              resolvedModel = candidate;
              break;
            } catch { continue; }
          }

          // Auto-heal DB if we switched models
          if (resolvedModel !== agent.model) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            supabaseAdmin.from("ai_agents").update({ model: resolvedModel }).eq("id", agent.id).then(() => {});
          }

          try {
            const result = streamText({
              model: gateway(resolvedModel),
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
