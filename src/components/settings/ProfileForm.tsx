"use client";

import { useState } from "react";
import { toast } from "sonner";

const MARKETING_ROLES = [
  { value: "", label: "— None —" },
  { value: "CONTENT_WRITER", label: "Content Writer" },
  { value: "GRAPHIC_DESIGNER", label: "Graphic Designer" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "SOCIAL_MEDIA_MANAGER", label: "Social Media Manager" },
  { value: "SEO_SPECIALIST", label: "SEO Specialist" },
  { value: "PERFORMANCE_MARKETER", label: "Performance Marketer" },
  { value: "CRM_EMAIL_MARKETER", label: "CRM / Email Marketer" },
  { value: "MARKETING_MANAGER", label: "Marketing Manager" },
];

interface Props {
  userId: string;
  initialName: string;
  initialMarketingRole: string | null;
}

export function ProfileForm({ userId, initialName, initialMarketingRole }: Props) {
  const [name, setName] = useState(initialName);
  const [marketingRole, setMarketingRole] = useState(initialMarketingRole ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = name !== initialName || marketingRole !== (initialMarketingRole ?? "");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), marketingRole: marketingRole || null }),
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Marketing Role</label>
          <select
            value={marketingRole}
            onChange={(e) => setMarketingRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]/50"
          >
            {MARKETING_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
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
