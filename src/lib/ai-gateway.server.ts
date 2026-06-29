import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV1 } from "ai";
import { getEnvVar } from "@/lib/cloudflare-context";

// Provider detection by model ID prefix
function detectProvider(modelId: string): "gemini" | "groq" | "openrouter" {
  if (modelId.startsWith("gemini-") || modelId.startsWith("models/gemini")) return "gemini";
  // Groq model IDs don't have "/" prefix (llama-3.3-70b-versatile, mixtral-8x7b, etc.)
  const groqModels = ["llama", "mixtral", "gemma2", "whisper", "qwen", "deepseek-r1-distill"];
  if (!modelId.includes("/") && groqModels.some(p => modelId.startsWith(p))) return "groq";
  return "openrouter";
}

export function resolveModel(modelId: string): LanguageModelV1 {
  const provider = detectProvider(modelId);

  if (provider === "gemini") {
    const key = getEnvVar("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY não configurada no Cloudflare");
    const google = createGoogleGenerativeAI({ apiKey: key });
    return google(modelId);
  }

  if (provider === "groq") {
    const key = getEnvVar("GROQ_API_KEY");
    if (!key) throw new Error("GROQ_API_KEY não configurada no Cloudflare");
    const groq = createGroq({ apiKey: key });
    return groq(modelId);
  }

  // OpenRouter — for when credits are available
  const key = getEnvVar("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada no Cloudflare");
  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://qrzum.com",
      "X-Title": "QRzum",
    },
  });
  return openrouter(modelId);
}

// Keep for backwards compat with scanai.ts
export function createOpenRouterProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://qrzum.com",
      "X-Title": "QRzum",
    },
  });
}
