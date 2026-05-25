"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AskAIPanelProps {
  open: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-bold text-gray-900 mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-bold text-gray-900 text-sm mt-2">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-[#e8170b]">{line.slice(2)}</p>;
        if (/^\d+\. /.test(line)) return <p key={i} className="pl-3">{line}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

export function AskAIPanel({ open, onClose, initialQuestion }: AskAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (initialQuestion && !didInit.current) {
        didInit.current = true;
        sendMessage(initialQuestion);
      }
    } else {
      didInit.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question) return;

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to reach AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col border-l border-gray-100">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e8170b] to-[#c91409] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">StackUp AI</p>
            <p className="text-[10px] text-gray-400">Ask anything about your projects & tasks</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e8170b]/10 to-[#e8170b]/5 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-[#e8170b]" />
              </div>
              <p className="text-sm font-semibold text-gray-700">How can I help you?</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[260px]">Ask me about tasks, campaigns, team workload, or anything else.</p>
              <div className="mt-5 flex flex-col gap-2 w-full max-w-[300px]">
                {["Summarize overdue tasks", "How to improve team productivity?", "What should I prioritize today?"].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e8170b] to-[#c91409] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                msg.role === "user"
                  ? "bg-[#e8170b] text-white text-[13px] rounded-tr-sm"
                  : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
              )}>
                {msg.role === "user"
                  ? <p className="text-[13px] leading-relaxed">{msg.content}</p>
                  : <MarkdownText text={msg.content} />
                }
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e8170b] to-[#c91409] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-[#e8170b] animate-spin" />
                <span className="text-[12px] text-gray-400">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#e8170b]/40 focus-within:ring-1 focus-within:ring-[#e8170b]/10 transition-all">
            <Sparkles className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-6 h-6 rounded-lg bg-[#e8170b] flex items-center justify-center disabled:opacity-40 hover:bg-[#c91409] transition-colors flex-shrink-0"
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
