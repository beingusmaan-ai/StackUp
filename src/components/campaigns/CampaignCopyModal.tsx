"use client";

import { useState } from "react";
import { X, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyData {
  adHeadlines: string[];
  instagramCaptions: string[];
  twitterPosts: string[];
  emailSubjects: string[];
  hashtags: string[];
  ctaOptions: string[];
}

type Tab = "headlines" | "instagram" | "twitter" | "email" | "hashtags" | "cta";

const TABS: { key: Tab; label: string }[] = [
  { key: "headlines", label: "Ad Headlines" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter/X" },
  { key: "email", label: "Email Subjects" },
  { key: "hashtags", label: "Hashtags" },
  { key: "cta", label: "CTAs" },
];

interface Props {
  campaignName: string;
  description?: string | null;
  goals?: string | null;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function CampaignCopyModal({ campaignName, description, goals, onClose }: Props) {
  const [copyData, setCopyData] = useState<CopyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("headlines");

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/campaign-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, description, goals }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCopyData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate copy");
    } finally {
      setLoading(false);
    }
  }

  const items: Record<Tab, string[]> = copyData ? {
    headlines: copyData.adHeadlines,
    instagram: copyData.instagramCaptions,
    twitter: copyData.twitterPosts,
    email: copyData.emailSubjects,
    hashtags: copyData.hashtags,
    cta: copyData.ctaOptions,
  } : { headlines: [], instagram: [], twitter: [], email: [], hashtags: [], cta: [] };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Campaign Copy Generator</h2>
              <p className="text-[11px] text-muted-foreground">{campaignName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!copyData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="w-10 h-10 text-violet-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-4">
              Generate ad copy, social captions, email subjects, hashtags, and CTAs for <span className="font-semibold text-foreground">{campaignName}</span>.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Generating copy…" : "Generate All Copy"}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 flex-shrink-0 border-b border-border overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                    activeTab === tab.key
                      ? "border-violet-500 text-violet-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items[activeTab].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl border border-border group">
                  <p className="text-[13px] text-foreground flex-1 leading-relaxed whitespace-pre-wrap">{item}</p>
                  <CopyButton text={item} />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-violet-600 hover:text-violet-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Regenerating…" : "Regenerate"}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-[13px] border border-border rounded-xl hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
