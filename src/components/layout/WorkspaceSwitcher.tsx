"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Check, Plus, X } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  color: string;
  _count: { campaigns: number; members: number };
}

function WorkspaceForm({ onClose, onCreated }: { onClose: () => void; onCreated: (w: Workspace) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#e8170b");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const COLORS = ["#e8170b", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create space"); return; }
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold text-gray-900">New Space</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-gray-600 mb-1 block">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Team"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8170b] focus:ring-1 focus:ring-[#e8170b]/20 transition"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-gray-600 mb-1 block">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8170b] focus:ring-1 focus:ring-[#e8170b]/20 transition"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-gray-600 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-all", color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #e8170b, #c91409)" }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function persistWorkspace(id: string | null) {
    setActiveWorkspaceId(id);
    if (id) {
      document.cookie = `activeWorkspaceId=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `activeWorkspaceId=; path=/; max-age=0; SameSite=Lax`;
    }
  }

  function loadWorkspaces() {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        const fetched: Workspace[] = d.data || [];
        setWorkspaces(fetched);
        if (fetched.length === 0) return;
        const valid = activeWorkspaceId && fetched.find((w) => w.id === activeWorkspaceId);
        if (!valid) {
          persistWorkspace(fetched[0].id);
        } else {
          document.cookie = `activeWorkspaceId=${activeWorkspaceId}; path=/; max-age=31536000; SameSite=Lax`;
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!session) return;
    loadWorkspaces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return (
    <>
      <div ref={ref} className="relative px-3 pb-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left",
            "bg-white dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.07]",
            "hover:border-black/20 dark:hover:border-white/15 hover:shadow-sm"
          )}
        >
          <span
            className="w-4 h-4 rounded-md flex-shrink-0"
            style={{ backgroundColor: activeWorkspace?.color ?? "#e8170b" }}
          />
          <span className="flex-1 text-[13px] font-semibold text-gray-800 dark:text-white/90 truncate">
            {activeWorkspace?.name ?? "Select Space"}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-[#1e293b] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-lg overflow-hidden">
            <div className="py-1 max-h-48 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { persistWorkspace(ws.id); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
                >
                  <span className="w-3.5 h-3.5 rounded-md flex-shrink-0" style={{ backgroundColor: ws.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-700 dark:text-white/80 truncate">{ws.name}</p>
                    <p className="text-[10px] text-gray-400">{ws._count.campaigns} project{ws._count.campaigns !== 1 ? "s" : ""}</p>
                  </div>
                  {activeWorkspaceId === ws.id && <Check className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-white/[0.06] p-1">
              <button
                onClick={() => { setOpen(false); setShowForm(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 text-[#e8170b]" />
                <span className="text-[12px] text-[#e8170b] font-medium">New Space</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <WorkspaceForm
          onClose={() => setShowForm(false)}
          onCreated={(w) => {
            setWorkspaces((prev) => [...prev, w]);
            persistWorkspace(w.id);
          }}
        />
      )}
    </>
  );
}
