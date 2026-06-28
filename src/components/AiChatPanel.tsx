import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Message = { id: string; role: "user" | "assistant"; text: string };

type Props = {
  agentSlug: string;
  agentName?: string;
  contextData?: string;
  onClose?: () => void;
  className?: string;
};

export function AiChatPanel({ agentSlug, agentName = "Assistente IA", contextData, onClose, className }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    const asstId = crypto.randomUUID();
    assistantIdRef.current = asstId;

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData.session?.access_token;
      if (!tok) throw new Error("Sessão expirada. Faça login novamente.");

      // Build core messages for the server
      const history = messages.map(m => ({ role: m.role, content: m.text }));
      history.push({ role: "user", content: text });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({ agentSlug, contextData, messages: history }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erro ${res.status}`);
      }

      // Add placeholder for assistant message
      setMessages(prev => [...prev, { id: asstId, role: "assistant", text: "" }]);

      // Parse Vercel AI data stream: lines like `0:"text chunk"\n`
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const chunk: string = JSON.parse(line.slice(2));
              assembled += chunk;
              setMessages(prev =>
                prev.map(m => m.id === asstId ? { ...m, text: assembled } : m)
              );
            } catch { /* skip malformed chunk */ }
          }
        }
      }

      // Final flush if buffer has remaining content
      if (buffer.startsWith("0:")) {
        try {
          const chunk: string = JSON.parse(buffer.slice(2));
          assembled += chunk;
          setMessages(prev =>
            prev.map(m => m.id === asstId ? { ...m, text: assembled } : m)
          );
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      setError(err.message ?? "Erro ao conectar com a IA.");
      // Remove empty assistant bubble on error
      setMessages(prev => prev.filter(m => m.id !== asstId));
    } finally {
      setIsLoading(false);
    }
  };

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
        {messages.length === 0 && !error && (
          <p className="text-center text-xs text-muted-foreground pt-6">
            {contextData
              ? "Os dados foram carregados. Faça uma pergunta sobre eles."
              : "Faça uma pergunta para começar."}
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={
              m.role === "user"
                ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "max-w-[85%] text-sm text-foreground whitespace-pre-wrap leading-relaxed"
            }>
              {m.text || (m.role === "assistant" && isLoading ? (
                <span className="flex gap-1.5 items-center py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                </span>
              ) : null)}
            </div>
          </div>
        ))}
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
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
