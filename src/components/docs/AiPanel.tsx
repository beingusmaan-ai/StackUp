"use client";

import { useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Sparkles, X, Copy, RotateCcw, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; prompt: string }[]> = {
  Marketing: [
    { label: "Campaign Brief",       prompt: "Create a detailed marketing campaign brief for:" },
    { label: "Email Campaign",       prompt: "Write a marketing email campaign for:" },
    { label: "Social Media Captions",prompt: "Write 3 engaging social media captions for:" },
    { label: "Ad Copy",              prompt: "Write compelling ad copy for:" },
    { label: "SEO Content Outline",  prompt: "Create an SEO-optimized content outline for:" },
    { label: "Ramadan Campaign",     prompt: "Create a launch brief for a Ramadan campaign for:" },
    { label: "Product Launch",       prompt: "Write a product launch announcement for:" },
  ],
  Sales: [
    { label: "Outreach Email",       prompt: "Write a professional sales outreach email for:" },
    { label: "Proposal",             prompt: "Write a sales proposal for:" },
    { label: "Follow-up Email",      prompt: "Write a follow-up email for:" },
    { label: "Cold Email",           prompt: "Write a cold outreach email for:" },
  ],
  HR: [
    { label: "Job Description",      prompt: "Write a detailed job description for:" },
    { label: "SOP",                  prompt: "Create a Standard Operating Procedure (SOP) for:" },
    { label: "Onboarding Guide",     prompt: "Create an employee onboarding guide for:" },
    { label: "Performance Review",   prompt: "Write a performance review template for:" },
  ],
  Product: [
    { label: "Feature Spec",         prompt: "Write a feature specification document for:" },
    { label: "PRD",                  prompt: "Create a Product Requirements Document (PRD) for:" },
    { label: "Release Notes",        prompt: "Write release notes for:" },
    { label: "User Story",           prompt: "Write user stories for:" },
  ],
  Engineering: [
    { label: "Technical Doc",        prompt: "Write technical documentation for:" },
    { label: "API Documentation",    prompt: "Write API documentation for:" },
    { label: "Architecture Overview",prompt: "Write a system architecture overview for:" },
  ],
};

const QUICK_ACTIONS = [
  { id: "rewrite",     label: "Rewrite" },
  { id: "fix-grammar", label: "Fix Grammar" },
  { id: "expand",      label: "Expand" },
  { id: "summarize",   label: "Summarize" },
  { id: "shorter",     label: "Make Shorter" },
  { id: "longer",      label: "Make Longer" },
];

const TONES = ["Professional", "Casual", "Formal", "Friendly", "Persuasive", "Concise"];

// ─── AiPanel ──────────────────────────────────────────────────────────────────

interface AiPanelProps {
  editor: Editor;
  docTitle: string;
  onClose: () => void;
}

export function AiPanel({ editor, docTitle, onClose }: AiPanelProps) {
  const [prompt, setPrompt]           = useState("");
  const [result, setResult]           = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ Marketing: true });
  const [showTones, setShowTones]     = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasSelection = !editor.state.selection.empty;
  const selectedText = hasSelection
    ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, "\n")
    : "";

  const run = async (action: string, overridePrompt?: string, tone?: string) => {
    if (isStreaming) { abortRef.current?.abort(); return; }
    const p = overridePrompt ?? prompt;
    if (!p && !selectedText && action !== "write") return;

    abortRef.current = new AbortController();
    setResult("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          action,
          prompt: p,
          content: selectedText || editor.getText(),
          context: docTitle,
          tone,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "AI request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setResult((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") toast.error(err.message ?? "StackUp Mind failed");
    } finally {
      setIsStreaming(false);
    }
  };

  const insertBelow = () => {
    if (!result) return;
    const html = `<p>${result.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    editor.chain().focus().insertContent(html).run();
    toast.success("Inserted into document");
  };

  const replaceSelection = () => {
    if (!result) return;
    const html = `<p>${result.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    editor.chain().focus().deleteSelection().insertContent(html).run();
    toast.success("Selection replaced");
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#e8170b] to-[#ff6b35] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">StackUp Mind</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick actions on selected text */}
        {hasSelection && (
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Selected text — quick actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => run(a.id)}
                  disabled={isStreaming}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border hover:bg-muted hover:border-[#e8170b]/30 hover:text-[#e8170b] transition-all disabled:opacity-40"
                >
                  {a.label}
                </button>
              ))}
              {/* Change tone sub-menu */}
              <div className="relative">
                <button
                  onClick={() => setShowTones((v) => !v)}
                  disabled={isStreaming}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border hover:bg-muted hover:border-[#e8170b]/30 hover:text-[#e8170b] transition-all disabled:opacity-40 flex items-center gap-1"
                >
                  Change Tone <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {showTones && (
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-30 overflow-hidden py-1 w-36">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        onClick={() => { run("change-tone", undefined, t); setShowTones(false); }}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom prompt */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Ask StackUp Mind
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run("custom"); } }}
            placeholder='Try: "Create a launch brief for a Ramadan campaign"'
            rows={3}
            className="w-full px-3 py-2 text-[12px] bg-muted rounded-xl border border-border outline-none resize-none focus:ring-2 focus:ring-[#e8170b]/30 placeholder:text-muted-foreground/40 text-foreground"
          />
          <button
            onClick={() => isStreaming ? abortRef.current?.abort() : run("custom")}
            className={cn(
              "mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[12px] font-semibold transition-colors",
              isStreaming
                ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500"
                : "bg-[#e8170b] hover:bg-[#c91409] text-white"
            )}
          >
            {isStreaming ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stop</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Generate</>
            )}
          </button>
        </div>

        {/* Templates */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Templates
          </p>
          <div className="space-y-1">
            {Object.entries(TEMPLATES).map(([category, items]) => (
              <div key={category} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))}
                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {category}
                  {openCategories[category]
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
                {openCategories[category] && (
                  <div className="border-t border-border">
                    {items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { setPrompt(item.prompt + " "); run("write", item.prompt); }}
                        disabled={isStreaming}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-0 disabled:opacity-40"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result area */}
      {(result || isStreaming) && (
        <div className="flex-shrink-0 border-t border-border">
          <div className="px-3 py-2 max-h-56 overflow-y-auto">
            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
              {result}
              {isStreaming && <span className="inline-block w-1 h-3.5 bg-[#e8170b] animate-pulse ml-0.5 align-middle" />}
            </p>
          </div>
          {!isStreaming && result && (
            <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
              <button
                onClick={insertBelow}
                className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-[#e8170b] hover:bg-[#c91409] text-white transition-colors"
              >
                Insert Below
              </button>
              {hasSelection && (
                <button
                  onClick={replaceSelection}
                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Replace
                </button>
              )}
              <button onClick={copyResult} title="Copy" className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={() => run("custom")} title="Regenerate" className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
