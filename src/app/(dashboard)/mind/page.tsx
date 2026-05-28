"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, User, Loader2, Plus,
  Search, Bell, FileText, RotateCcw, Clipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-bold mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-bold text-sm mt-2">{line.slice(2)}</p>;
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

// ─── Quick action cards ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    Icon: FileText,
    title: "Project Summary",
    description: "Summarize active projects",
    prompt: "Give me a summary of all active projects and their current status.",
  },
  {
    Icon: Plus,
    title: "New Task",
    description: "Create task from notes",
    prompt: "I have meeting notes I want to turn into tasks. How do I do that?",
  },
  {
    Icon: Search,
    title: "Find Tasks",
    description: "Search overdue tasks",
    prompt: "What tasks are overdue right now?",
  },
  {
    Icon: Bell,
    title: "Team Update",
    description: "What did the team complete?",
    prompt: "What did the team complete this week?",
  },
];

// ─── Suggested starters ───────────────────────────────────────────────────────

const STARTERS = [
  "What tasks are due today?",
  "Which campaigns are behind schedule?",
  "Who has the most tasks assigned?",
  "Summarize this week's progress",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MindPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState<"ask" | "templates">("ask");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const { activeTeamId } = useUIStore();

  const hasMessages = messages.length > 0 || loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({ question, history, teamId: activeTeamId }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || data.error || "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to reach AI. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">

      {/* Soft gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#e8170b]/6 via-background/30 to-transparent pointer-events-none" />

      {!hasMessages ? (
        /* ── Landing state ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8170b] via-[#ff4500] to-[#ff6b35] flex items-center justify-center shadow-lg shadow-[#e8170b]/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">StackUp Mind</h1>
              <p className="text-sm text-muted-foreground">Your AI workspace assistant</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab("ask")}
              className={cn(
                "flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "ask"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={cn(
                "flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "templates"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Templates
            </button>
          </div>

          {activeTab === "ask" ? (
            <>
              {/* Input box */}
              <div className="w-full max-w-2xl">
                <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#e8170b] via-[#ff4500] to-[#ff6b35] shadow-lg shadow-[#e8170b]/10">
                  <div className="bg-background rounded-[14px] p-4">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Get instant answers, insights, and ideas."
                      rows={3}
                      className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <button className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-muted transition-colors text-[12px] text-muted-foreground font-medium">
                          <Sparkles className="w-3 h-3 text-[#e8170b]" />
                          StackUp Mind
                        </button>
                      </div>
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim()}
                        className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e8170b] to-[#ff4500] flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity shadow-sm shadow-[#e8170b]/30"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick action cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-5">
                {QUICK_ACTIONS.map(({ Icon, title, description, prompt }) => (
                  <button
                    key={title}
                    onClick={() => sendMessage(prompt)}
                    className="flex flex-col items-start gap-2 p-3.5 bg-card border border-border rounded-xl hover:border-[#e8170b]/30 hover:shadow-sm hover:shadow-[#e8170b]/5 transition-all text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-[#e8170b]/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#e8170b] transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{title}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Templates tab */
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "Weekly Team Report", prompt: "Generate a weekly team report summarizing tasks completed, in progress, and blocked." },
                { title: "Project Health Check", prompt: "Give me a health check for all active projects — what's on track and what needs attention?" },
                { title: "Overdue Task Audit", prompt: "List all overdue tasks grouped by team member, with how many days they're overdue." },
                { title: "Upcoming Deadlines", prompt: "What tasks and projects have deadlines in the next 7 days?" },
                { title: "Team Workload", prompt: "Who has the most tasks assigned and who has capacity to take on more work?" },
                { title: "Campaign Progress", prompt: "Summarize the progress of all active campaigns — what percentage is complete?" },
              ].map(({ title, prompt }) => (
                <button
                  key={title}
                  onClick={() => { setActiveTab("ask"); sendMessage(prompt); }}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-[#e8170b]/30 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e8170b]/10 to-[#ff6b35]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#e8170b]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground group-hover:text-[#e8170b] transition-colors">{title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{prompt.slice(0, 60)}…</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Conversation state ── */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0 relative">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e8170b] to-[#ff6b35] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-foreground">StackUp Mind</span>
            </div>
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              New chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e8170b] to-[#ff6b35] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 relative group",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#e8170b] to-[#ff4500] text-white rounded-tr-sm shadow-sm shadow-[#e8170b]/20"
                    : "bg-card border border-border text-foreground rounded-tl-sm"
                )}>
                  {msg.role === "user"
                    ? <p className="text-[13px] leading-relaxed">{msg.content}</p>
                    : <MarkdownText text={msg.content} />
                  }
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                    >
                      <Clipboard className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e8170b] to-[#ff6b35] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#e8170b] animate-spin" />
                  <span className="text-[12px] text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            {/* Suggested follow-ups when not loading */}
            {!loading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
              <div className="flex flex-wrap gap-2 pl-10">
                {STARTERS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 rounded-full border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-[#e8170b]/30 hover:bg-[#e8170b]/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border">
            <div className="max-w-3xl mx-auto">
              <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#e8170b] via-[#ff4500] to-[#ff6b35]">
                <div className="bg-background rounded-[14px] px-4 pt-3 pb-3">
                  <textarea
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up…"
                    rows={1}
                    disabled={loading}
                    className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors text-[11px] text-muted-foreground font-medium">
                        <Sparkles className="w-3 h-3 text-[#e8170b]" />
                        StackUp Mind
                      </button>
                    </div>
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || loading}
                      className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e8170b] to-[#ff4500] flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
