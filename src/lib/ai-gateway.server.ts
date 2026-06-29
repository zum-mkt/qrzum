import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV1 } from "ai";
import { getEnvVar } from "@/lib/cloudflare-context";

const GEMINI_FREE = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
const GROQ_FREE = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];

function detectProvider(modelId: string): "gemini" | "groq" | "openrouter" {
  if (modelId.startsWith("gemini-") || modelId.startsWith("models/gemini")) return "gemini";
  const groqPrefixes = ["llama", "mixtral", "gemma2", "whisper", "qwen", "deepseek-r1-distill"];
  if (!modelId.includes("/") && groqPrefixes.some(p => modelId.startsWith(p))) return "groq";
  return "openrouter";
}

export function resolveModel(modelId: string): LanguageModelV1 {
  const provider = detectProvider(modelId);

  if (provider === "gemini") {
    const key = getEnvVar("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY não configurada no Cloudflare");
    return createGoogleGenerativeAI({ apiKey: key })(modelId);
  }

  if (provider === "groq") {
    const key = getEnvVar("GROQ_API_KEY");
    if (!key) throw new Error("GROQ_API_KEY não configurada no Cloudflare");
    return createGroq({ apiKey: key })(modelId);
  }

  const key = getEnvVar("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada no Cloudflare");
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: { Authorization: `Bearer ${key}`, "HTTP-Referer": "https://qrzum.com", "X-Title": "QRzum" },
  })(modelId);
}

// Checks if an error (or stream chunk) indicates a quota/rate-limit issue
export function isQuotaError(value: unknown): boolean {
  const msg = (value instanceof Error ? value.message : String(value)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("resourceexhausted") ||
    msg.includes("too many requests") ||
    msg.includes("limit exceeded") ||
    msg.includes("daily limit") ||
    msg.includes("tokens per")
  );
}

// Builds an ordered fallback chain of model IDs using only configured providers.
// Primary model first, then same-provider alternates, then cross-provider fallback.
export function buildFallbackChain(primaryModelId: string): string[] {
  const provider = detectProvider(primaryModelId);
  if (provider === "openrouter") return [primaryModelId];

  const hasGemini = !!getEnvVar("GEMINI_API_KEY");
  const hasGroq = !!getEnvVar("GROQ_API_KEY");

  const chain: string[] = [primaryModelId];

  if (provider === "gemini") {
    if (hasGemini) GEMINI_FREE.forEach(m => { if (!chain.includes(m)) chain.push(m); });
    if (hasGroq) GROQ_FREE.forEach(m => chain.push(m));
  } else {
    if (hasGroq) GROQ_FREE.forEach(m => { if (!chain.includes(m)) chain.push(m); });
    if (hasGemini) GEMINI_FREE.forEach(m => chain.push(m));
  }

  return chain;
}

export function createOpenRouterProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: { Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://qrzum.com", "X-Title": "QRzum" },
  });
}
