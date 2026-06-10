import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai/$shortId")({
  component: ScanAIChat,
});

function ScanAIChat() {
  const { shortId } = Route.useParams();
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const k = `scanai:${shortId}`;
    let s = localStorage.getItem(k);
    if (!s) { s = crypto.randomUUID(); localStorage.setItem(k, s); }
    return s;
  }, [shortId]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "pt-BR";

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/public/scanai",
    body: { shortId, sessionId, locale },
  }), [shortId, sessionId, locale]);

  const { messages, sendMessage, status } = useChat({ id: `scanai-${shortId}`, transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Assistente IA</h1>
            <p className="text-xs text-muted-foreground">Pergunte sobre este item</p>
          </div>
        </div>
      </header>
      <div ref={scrollRef} className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Faça uma pergunta para começar.</p>
        )}
        {messages.map((m) => {
          const text = m.parts.map(p => p.type === "text" ? p.text : "").join("");
          return (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                  : "max-w-[80%] text-sm text-foreground whitespace-pre-wrap"
              }>{text}</div>
            </div>
          );
        })}
        {(status === "submitted" || status === "streaming") && messages[messages.length - 1]?.role === "user" && (
          <p className="text-sm text-muted-foreground">Pensando…</p>
        )}
      </div>
      <form onSubmit={submit} className="border-t border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo…"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { submit(e as any); } }}
            className="min-h-10 resize-none"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={status === "submitted" || status === "streaming" || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}