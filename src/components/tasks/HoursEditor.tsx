"use client";

import { useState, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface HoursEditorProps {
  taskId: string;
  initialHours: number | null;
  onSuccess?: () => void;
}

export function HoursEditor({ taskId, initialHours, onSuccess }: HoursEditorProps) {
  const [hours, setHours] = useState<number | null>(initialHours);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialHours?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(hours?.toString() ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancel() {
    setEditing(false);
    setValue(hours?.toString() ?? "");
  }

  async function save() {
    const parsed = value.trim() === "" ? null : parseFloat(value);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error("Enter a valid number of hours");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedHours: parsed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Failed to update");
      }
      setHours(parsed);
      setEditing(false);
      toast.success("Hours updated");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          min="0"
          step="0.5"
          placeholder="0"
          disabled={saving}
          className="w-20 px-2 py-1 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#e8170b] disabled:opacity-50"
        />
        <span className="text-sm text-muted-foreground">h</span>
        <button
          onClick={save}
          disabled={saving}
          className="w-6 h-6 rounded-md bg-[#e8170b] text-white flex items-center justify-center hover:bg-[#c91409] disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-[#e8170b] transition-colors"
    >
      <span>{hours != null ? `${hours}h` : "Not set"}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}
