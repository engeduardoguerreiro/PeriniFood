"use client";

import { Bot, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Atendente de IA no cardápio online (módulo pago). Botão flutuante que abre o
// chat; o histórico da conversa fica no servidor, ligado a uma sessão anônima.
type Message = { role: "user" | "assistant"; text: string };

const suggestions = ["Qual o horário de hoje?", "Vocês entregam no meu bairro?", "Quais sabores de pizza vocês têm?"];

function sessionKey(slug: string) {
  return `pf_ai_session_${slug}`;
}

function getSession(slug: string) {
  try {
    const saved = window.localStorage.getItem(sessionKey(slug));
    if (saved) return saved;
    const created = crypto.randomUUID();
    window.localStorage.setItem(sessionKey(slug), created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function AiChat({ restaurantId, slug, name }: { restaurantId: string; slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: `Olá! 👋 Sou o atendente virtual da ${name}. Posso ajudar com cardápio, preços, horários e entrega.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, sessionId: getSession(slug), message }),
      });
      const json = await response.json().catch(() => ({}));
      setMessages((current) => [...current, { role: "assistant", text: json.reply || json.message || "Não consegui responder agora. Tente de novo." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "Sem conexão no momento. Tente de novo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Falar com o atendente virtual"
          className="fixed bottom-24 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-ink pl-4 pr-5 font-bold text-white shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 lg:bottom-6"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-brand-bright to-brand"><Bot className="h-5 w-5" /></span>
          <span className="hidden text-sm sm:inline">Dúvidas? Fale comigo</span>
        </button>
      )}

      {open && (
        <div role="dialog" aria-label="Atendente virtual" className="fixed inset-x-0 bottom-0 z-50 flex h-[80dvh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-3xl">
          <header className="flex items-center gap-3 rounded-t-3xl bg-ink px-4 py-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-brand-bright to-brand"><Bot className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">Atendente virtual</p>
              <p className="truncate text-xs text-white/60">{name}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f6f5f2] p-4" aria-live="polite">
            {messages.map((message, index) => (
              <p key={index} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "ml-auto rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white text-ink shadow-sm"}`}>
                {message.text}
              </p>
            ))}
            {loading && <p className="flex w-16 items-center justify-center rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></p>}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand">{s}</button>
                ))}
              </div>
            )}
          </div>

          <form className="flex gap-2 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={(event) => { event.preventDefault(); send(input); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} aria-label="Sua mensagem" placeholder="Escreva sua dúvida…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar" className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-b from-brand-bright to-brand text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
