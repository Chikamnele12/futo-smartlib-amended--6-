import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const ROUTES = {
  academic_book: "/academic-books",
  ebook: "/ebooks",
  pdf: "/pdf-library",
  revision_note: "/revision-notes",
  past_question: "/past-questions",
};
const LABELS = {
  academic_book: "Academic Book",
  ebook: "eBook",
  pdf: "PDF",
  revision_note: "Revision Note",
  past_question: "Past Question",
};
const SUGGESTIONS = [
  "Past questions for my level",
  "Books for CSC 301",
  "How do I borrow a book?",
  "What happens if I return late?",
];

async function friendlyError(error) {
  try {
    const body = await error.context?.json?.();
    if (body?.error) return body.error;
  } catch { /* ignore */ }
  return "I couldn't reach the assistant. Check your connection and try again.";
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, resources? }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput("");
    const next = [...messages, { role: "user", content: question }];
    setMessages(next);
    setBusy(true);

    const { data, error } = await supabase.functions.invoke("ask-library", {
      body: { messages: next.map(({ role, content }) => ({ role, content })) },
    });

    if (error || data?.error) {
      const msg = error ? await friendlyError(error) : data.error;
      setMessages([...next, { role: "assistant", content: msg, isError: true }]);
    } else {
      setMessages([...next, { role: "assistant", content: data.answer, resources: data.resources || [] }]);
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask the SmartLib assistant"
        className="btn-primary fixed right-4 bottom-20 lg:bottom-6 lg:right-6 z-20 h-12 pl-3.5 pr-4 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        <Sparkles size={17} /> Ask AI
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="SmartLib assistant"
      className="fixed z-50 inset-x-0 bottom-0 h-[85vh] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[26rem] lg:h-[36rem] bg-paper-50 border border-paper-300 rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col page-enter"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-paper-300">
        <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center">
          <Sparkles size={15} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-ink-900 leading-tight">SmartLib Assistant</p>
          <p className="text-[11px] text-ink-500 leading-tight">Finds resources and answers library questions</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close assistant" className="ml-auto p-1.5 rounded-md text-ink-500 hover:bg-paper-200">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-paper-100 px-3.5 py-2.5 text-sm text-ink-900">
          Hi! Ask me for books or past questions by course code, topic or level, or how borrowing works.
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs border border-paper-300 rounded-full px-3 py-1.5 text-ink-700 hover:bg-paper-200 hover:border-brand-500 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-700 text-white px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${m.isError ? "bg-rose-soft text-rose-ink" : "bg-paper-100 text-ink-900"}`}>
                {m.content}
              </div>
              {m.resources?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.resources.map((r) => (
                    <Link
                      key={r.id}
                      to={ROUTES[r.type] || "/dashboard"}
                      onClick={() => setOpen(false)}
                      className="block border border-paper-300 rounded-lg px-3 py-2 hover:border-brand-500 hover:bg-paper-100 transition-colors"
                    >
                      <p className="text-xs font-semibold text-ink-900 truncate">{r.title}</p>
                      <p className="text-[11px] text-ink-500">
                        {LABELS[r.type] || r.type}{r.course_code ? ` · ${r.course_code}` : ""} · open the list
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 size={14} className="animate-spin" /> Looking through the catalog...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="p-3 border-t border-paper-300 flex items-center gap-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask about books, courses, borrowing..."
          className="flex-1 min-w-0 border border-paper-300 bg-paper-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="btn-primary w-10 h-10 shrink-0 rounded-full flex items-center justify-center disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
