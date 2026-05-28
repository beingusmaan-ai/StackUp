"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, User, Loader2, ChevronDown, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import type { AIModel } from "@/lib/ai-models";
import { PROVIDER_ICONS } from "@/lib/ai-models";

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
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-bold text-gray-900 mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-bold text-gray-900 text-sm mt-2">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-[#e8170b]">{line.slice(2)}</p>;
        if (/^\d+\. /.test(line)) return <p key={i} className="pl-3">{line}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

export function AskAIPanel({ open, onClose, initialQuestion }: AskAIPanelProps) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [models, setModels]       = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("groq/llama-3.3-70b-versatile");
  const [showPicker, setShowPicker] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const pickerRef  = useRef<HTMLDivElement>(null);
  const didInit    = useRef(false);
  const { activeTeamId } = useUIStore();

  // Fetch available models once
  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length) {
          setModels(d.models);
          setSelectedModel(d.models[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Focus input and run initial question when opened
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

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, teamId: activeTeamId, model: selectedModel }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to reach AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel);
  const groupedModels = models.reduce<Record<string, AIModel[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col border-l border-gray-100">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e8170b] to-[#ff4500] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">StackUp Mind</p>
            <p className="text-[10px] text-gray-400">Ask anything about your projects & tasks</p>
          </div>
          <Link
            href="/mind"
            onClick={onClose}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#e8170b] transition-colors mr-1"
            title="Open full view"
          >
            <ExternalLink className="w-3 h-3" />
            Full view
          </Link>
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
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e8170b] to-[#ff4500] flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e8170b] to-[#ff4500] flex items-center justify-center flex-shrink-0">
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

        {/* Input + model picker */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 space-y-2">

          {/* Model picker */}
          <div ref={pickerRef} className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors text-[11px] text-gray-500 font-medium"
            >
              <span>{selectedModelInfo ? PROVIDER_ICONS[selectedModelInfo.provider] : "⚡"}</span>
              <span>{selectedModelInfo?.name ?? "StackUp Mind"}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showPicker && (
              <div className="absolute bottom-full left-0 mb-1 w-68 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden py-2" style={{ width: 260 }}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-1.5">Select model</p>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <p className="text-[10px] text-gray-400/60 font-medium px-3 pt-2 pb-0.5">{provider}</p>
                    {providerModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setShowPicker(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{PROVIDER_ICONS[m.provider]}</span>
                          <div>
                            <p className="text-[12px] font-medium text-gray-800">{m.name}</p>
                            <p className="text-[10px] text-gray-400">{m.description}</p>
                          </div>
                        </div>
                        {selectedModel === m.id && <Check className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#e8170b]/40 focus-within:ring-1 focus-within:ring-[#e8170b]/10 transition-all"
          >
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
