"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export function NotepadPanel({ onClose, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery<{ data: Note[] }>({
    queryKey: ["notes"],
    queryFn: () => fetch("/api/notes").then((r) => r.json()),
    staleTime: 30_000,
  });
  const notes = data?.data ?? [];

  const createNote = useMutation({
    mutationFn: () =>
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      const id = res.data?.id;
      if (id) {
        setActiveNoteId(id);
        setDraft("");
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => fetch(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setDraft("");
      }
    },
  });

  // When active note changes, load its content into draft
  useEffect(() => {
    if (activeNoteId) {
      const note = notes.find((n) => n.id === activeNoteId);
      if (note) setDraft(note.content);
    }
  }, [activeNoteId, notes]);

  // Auto-select first note on load
  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  // Debounced save
  const scheduleSave = useCallback(
    (id: string, content: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote.mutate({ id, content });
      }, 800);
    },
    [updateNote]
  );

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setDraft(value);
    if (activeNoteId) scheduleSave(activeNoteId, value);
  }

  // Click outside closes
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (anchorRef?.current && anchorRef.current.contains(target)) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        if (activeNoteId && draft !== undefined) {
          updateNote.mutate({ id: activeNoteId, content: draft });
        }
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef, activeNoteId, draft, updateNote]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div
      ref={panelRef}
      className="fixed top-[72px] right-4 z-50 w-[340px] max-h-[520px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <ClipboardList className="w-4 h-4 text-[#e8170b]" />
        <span className="text-sm font-semibold text-foreground flex-1">Notepad</span>
        <button
          onClick={() => createNote.mutate()}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="New note"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Note list sidebar */}
        <div className="w-[120px] flex-shrink-0 border-r border-border overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-xs text-muted-foreground">Loading…</div>
          )}
          {!isLoading && notes.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No notes yet</div>
          )}
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors group",
                activeNoteId === note.id
                  ? "bg-[#e8170b]/8 border-l-2 border-l-[#e8170b]"
                  : "hover:bg-muted/60"
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                {format(new Date(note.updatedAt), "MMM d")}
              </p>
              <p className="text-[12px] text-foreground truncate mt-0.5 leading-snug">
                {note.content.split("\n")[0] || (
                  <span className="italic text-muted-foreground">Empty note</span>
                )}
              </p>
            </button>
          ))}
        </div>

        {/* Editor pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeNote ? (
            <>
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(activeNote.updatedAt), "MMM d, yyyy")}
                </span>
                <button
                  onClick={() => deleteNote.mutate(activeNote.id)}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleContentChange}
                placeholder="Write something…"
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none px-3 pb-3 leading-relaxed"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                {notes.length === 0 ? "No notes yet." : "Select a note to edit."}
              </p>
              <button
                onClick={() => createNote.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8170b] hover:bg-[#c91409] text-white text-xs rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                New note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => createNote.mutate()}
          className="flex items-center gap-1 text-[11px] text-[#e8170b] hover:text-[#c91409] font-medium transition-colors"
        >
          <Plus className="w-3 h-3" /> New note
        </button>
      </div>
    </div>
  );
}
