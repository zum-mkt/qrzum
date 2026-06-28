import { useRef, useState, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  agentSlug: string;
  agentName?: string;
  contextData?: string;
  onClose?: () => void;
  className?: string;
};

export function AiChatPanel({ agentSlug, agentName = "Assistente IA", contextData, onClose, className }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ai/chat",
    body: { agentSlug, contextData },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }), [agentSlug, contextData, token]);

  const { messages, sendMessage, status } = useChat({
    id: `ai-${agentSlug}`,
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming" || !token) return;
    setInput("");
    await sendMessage({ text });
  };

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className={`flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-xl ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-secondary/30">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">{agentName}</span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-4 py-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground pt-6">
            {contextData
              ? "Os dados foram carregados. Faça uma pergunta sobre eles."
              : "Faça uma pergunta para começar."}
          </p>
        )}
        {messages.map((m) => {
          const text = m.parts.map(p => p.type === "text" ? p.text : "").join("");
          return (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] text-sm text-foreground whitespace-pre-wrap leading-relaxed"
              }>{text}</div>
            </div>
          );
        })}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-1.5 items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="border-t border-border px-3 py-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta…"
          rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e as any); }}
          className="min-h-9 resize-none flex-1 text-sm"
          disabled={!token}
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isStreaming || !input.trim() || !token}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
