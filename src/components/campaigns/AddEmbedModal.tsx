"use client";

import { useState } from "react";
import { X, Link, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEmbedModalProps {
  campaignId: string;
  onClose: () => void;
  onSuccess: (embed: { id: string; name: string; url: string; icon: string | null }) => void;
}

const PRESETS = [
  { name: "Google Sheets",   icon: "📊", hint: "https://docs.google.com/spreadsheets/...",    transform: (u: string) => u.includes("/edit") ? u.replace("/edit", "/pubhtml") : u },
  { name: "Google Docs",     icon: "📝", hint: "https://docs.google.com/document/...",         transform: (u: string) => u.includes("/edit") ? u.replace("/edit", "/preview") : u },
  { name: "Google Calendar", icon: "📅", hint: "https://calendar.google.com/...",              transform: (u: string) => u },
  { name: "Figma",           icon: "🎨", hint: "https://www.figma.com/file/...",               transform: (u: string) => `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u)}` },
  { name: "YouTube",         icon: "▶️", hint: "https://www.youtube.com/watch?v=...",          transform: (u: string) => { const m = u.match(/(?:v=|youtu\.be\/)([^&]+)/); return m ? `https://www.youtube.com/embed/${m[1]}` : u; } },
  { name: "Google Maps",     icon: "🗺️", hint: "Paste an embed URL from Google Maps Share",   transform: (u: string) => u },
  { name: "Notion",          icon: "⬛", hint: "https://notion.so/...",                         transform: (u: string) => u },
  { name: "Any website",     icon: "🌐", hint: "https://...",                                  transform: (u: string) => u },
];

export function AddEmbedModal({ campaignId, onClose, onSuccess }: AddEmbedModalProps) {
  const [selected, setSelected] = useState<typeof PRESETS[0] | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePreset(preset: typeof PRESETS[0]) {
    setSelected(preset);
    setName(preset.name);
    setUrl("");
    setError("");
  }

  async function handleSave() {
    if (!name.trim() || !url.trim()) { setError("Name and URL are required."); return; }
    let finalUrl = url.trim();
    if (selected?.transform) finalUrl = selected.transform(finalUrl);

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/embeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: finalUrl, icon: selected?.icon ?? "🌐" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      onSuccess(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-[#e8170b]" />
            <h2 className="text-sm font-semibold">Add Embed</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preset picker */}
          {!selected ? (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Choose a source</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handlePreset(p)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border hover:border-[#e8170b]/40 hover:bg-[#e8170b]/5 transition-all text-left group"
                  >
                    <span className="text-lg flex-shrink-0">{p.icon}</span>
                    <span className="text-sm font-medium text-foreground group-hover:text-[#e8170b] transition-colors">{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setSelected(null); setName(""); setUrl(""); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                <span className="text-2xl">{selected.icon}</span>
                <span className="text-sm font-semibold">{selected.name}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tab name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selected.name}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#e8170b]/50 focus:ring-1 focus:ring-[#e8170b]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">URL</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={selected.hint}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#e8170b]/50 focus:ring-1 focus:ring-[#e8170b]/10 transition-all font-mono text-xs"
                  />
                  {selected.name === "Google Sheets" && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                      <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      For Google Sheets, go to File → Share → Publish to web, then paste the link here.
                    </p>
                  )}
                  {selected.name === "Figma" && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                      <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Paste your Figma file or prototype URL. Make sure link sharing is enabled.
                    </p>
                  )}
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || !url.trim()}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding…" : "Add Embed"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
