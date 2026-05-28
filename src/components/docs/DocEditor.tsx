"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight, Highlighter, Link2,
  Save, Clock, Share2, Megaphone, CheckSquare as TaskIcon, X as XIcon, ChevronDown as ChevronDownIcon,
  Sparkles,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "./ShareModal";
import { AiPanel } from "./AiPanel";

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  content?: unknown;
  isPublic?: boolean;
  campaignId?: string | null;
  taskId?: string | null;
  campaign?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
  updatedAt: string;
  createdBy: { name: string };
};

interface DocEditorProps {
  doc: Doc;
}

const EMOJI_OPTIONS = ["📄", "📝", "📋", "📌", "📍", "💡", "🎯", "🚀", "✅", "📊", "🗂️", "📖", "🔖", "💼", "🌟"];

export function DocEditor({ doc }: DocEditorProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon || "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(doc.updatedAt);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isPublic, setIsPublic] = useState(doc.isPublic ?? false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkPickerRef = useRef<HTMLDivElement>(null);
  const [linkedCampaign, setLinkedCampaign] = useState<{ id: string; name: string } | null>(doc.campaign ?? null);
  const [linkedTask, setLinkedTask] = useState<{ id: string; title: string } | null>(doc.task ?? null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkPickerType, setLinkPickerType] = useState<"campaign" | "task">("campaign");
  const [linkSearch, setLinkSearch] = useState("");
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);

  const save = async (data: { title?: string; content?: unknown; icon?: string; campaignId?: string; taskId?: string }) => {
    setSaving(true);
    try {
      await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setLastSaved(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["docs"] });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const debouncedSave = (data: { title?: string; content?: unknown; icon?: string; campaignId?: string; taskId?: string }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(data), 1000);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing… Type '/' for commands" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
    ],
    content: doc.content ? (doc.content as object) : "",
    onUpdate: ({ editor }) => {
      debouncedSave({ content: editor.getJSON() });
    },
    editorProps: {
      attributes: { class: "doc-editor-content focus:outline-none min-h-[60vh]" },
    },
  });

  useEffect(() => {
    setTitle(doc.title);
    setIcon(doc.icon || "");
    setLastSaved(doc.updatedAt);
    setLinkedCampaign(doc.campaign ?? null);
    setLinkedTask(doc.task ?? null);
    if (editor && doc.content) {
      editor.commands.setContent(doc.content as object);
    } else if (editor) {
      editor.commands.clearContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  useEffect(() => {
    if (!showLinkPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (linkPickerRef.current && !linkPickerRef.current.contains(e.target as Node)) {
        setShowLinkPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showLinkPicker]);

  const fetchCampaigns = async () => {
    const res = await fetch("/api/campaigns?picker=1");
    const data = await res.json();
    setCampaigns((data.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
  };

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks?picker=1");
    const data = await res.json();
    setTasks((data.data || []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
  };

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, title: t, children }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      title={t}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded transition-colors text-sm",
        active
          ? "bg-[#e8170b]/10 text-[#e8170b]"
          : "text-gray-500 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-gray-800 dark:hover:text-white"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border flex-shrink-0 mx-0.5" />;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-0.5 px-4 py-1.5 border-b border-border flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Checklist">
          <CheckSquare className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
          <Code className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn
          onClick={() => {
            const url = window.prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Insert link"
        >
          <Link2 className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* Save status + AI + Share */}
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {saving ? (
              <><Save className="w-3 h-3 animate-pulse" /> Saving…</>
            ) : (
              <><Clock className="w-3 h-3" /> Saved {formatRelative(lastSaved)}</>
            )}
          </span>
          <button
            onClick={() => setShowAI((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              showAI
                ? "bg-gradient-to-r from-[#e8170b] to-[#ff6b35] text-white border-transparent"
                : "border-[#e8170b]/30 text-[#e8170b] hover:bg-[#e8170b]/5"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            StackUp Mind
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8170b] hover:bg-[#c91409] text-white text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Editor area + AI panel */}
      <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Icon picker */}
          <div className="relative mb-3">
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="text-4xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-xl p-1 transition-colors"
              title="Change icon"
            >
              {icon || "📄"}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 p-2 bg-white dark:bg-[#1e293b] border border-border rounded-xl shadow-lg z-20 w-64">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setIcon(e);
                      setShowEmojiPicker(false);
                      save({ icon: e });
                    }}
                    className="text-xl p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    {e}
                  </button>
                ))}
                <button
                  onClick={() => { setIcon(""); setShowEmojiPicker(false); save({ icon: "" }); }}
                  className="text-xs text-muted-foreground px-2 py-1 hover:bg-muted rounded-lg transition-colors w-full text-left"
                >
                  Remove icon
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); debouncedSave({ title: e.target.value }); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus(); } }}
            placeholder="Untitled"
            className="w-full text-4xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-2 resize-none"
          />

          <p className="text-xs text-muted-foreground mb-3">
            By {doc.createdBy.name} · Last edited {formatRelative(lastSaved)}
          </p>

          {/* Link to project / task */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {linkedCampaign && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800">
                <Megaphone className="w-3 h-3 flex-shrink-0" />
                {linkedCampaign.name}
                <button
                  onClick={() => { setLinkedCampaign(null); save({ campaignId: "" }); }}
                  className="ml-0.5 hover:text-orange-900 dark:hover:text-orange-100"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {linkedTask && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                <TaskIcon className="w-3 h-3 flex-shrink-0" />
                {linkedTask.title}
                <button
                  onClick={() => { setLinkedTask(null); save({ taskId: "" }); }}
                  className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            <div className="relative" ref={linkPickerRef}>
              <button
                onClick={() => {
                  if (!showLinkPicker) {
                    if (linkPickerType === "campaign") fetchCampaigns();
                    else fetchTasks();
                  }
                  setShowLinkPicker(v => !v);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-full border border-dashed border-border transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Link to...
              </button>
              {showLinkPicker && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#1e293b] border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                  <div className="flex border-b border-border">
                    <button
                      onClick={() => { setLinkPickerType("campaign"); setLinkSearch(""); fetchCampaigns(); }}
                      className={cn(
                        "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                        linkPickerType === "campaign"
                          ? "text-[#e8170b] border-b-2 border-[#e8170b]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Projects
                    </button>
                    <button
                      onClick={() => { setLinkPickerType("task"); setLinkSearch(""); fetchTasks(); }}
                      className={cn(
                        "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                        linkPickerType === "task"
                          ? "text-[#e8170b] border-b-2 border-[#e8170b]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Tasks
                    </button>
                  </div>
                  <div className="p-2">
                    <input
                      value={linkSearch}
                      onChange={e => setLinkSearch(e.target.value)}
                      placeholder={`Search ${linkPickerType === "campaign" ? "projects" : "tasks"}…`}
                      className="w-full px-2.5 py-1.5 text-xs bg-muted rounded-lg outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto pb-1">
                    {linkPickerType === "campaign"
                      ? campaigns
                          .filter(c => c.name.toLowerCase().includes(linkSearch.toLowerCase()))
                          .map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setLinkedCampaign(c); setShowLinkPicker(false); save({ campaignId: c.id }); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                            >
                              <Megaphone className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                              {c.name}
                            </button>
                          ))
                      : tasks
                          .filter(t => t.title.toLowerCase().includes(linkSearch.toLowerCase()))
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => { setLinkedTask(t); setShowLinkPicker(false); save({ taskId: t.id }); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                            >
                              <TaskIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              {t.title}
                            </button>
                          ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TipTap content */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AI panel */}
      {showAI && (
        <AiPanel editor={editor} docTitle={title} onClose={() => setShowAI(false)} />
      )}
      </div>

      {showShare && (
        <ShareModal
          docId={doc.id}
          docTitle={title}
          isPublic={isPublic}
          createdBy={doc.createdBy}
          onClose={() => setShowShare(false)}
          onPublicToggle={(v) => setIsPublic(v)}
        />
      )}
    </div>
  );
}
