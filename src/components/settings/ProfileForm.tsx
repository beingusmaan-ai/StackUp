"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  userId: string;
  initialName: string;
}

export function ProfileForm({ userId, initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const dirty = name !== initialName;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]/50"
        />
      </div>

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-[#e8170b] text-white text-sm font-medium rounded-lg hover:bg-[#c91409] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
