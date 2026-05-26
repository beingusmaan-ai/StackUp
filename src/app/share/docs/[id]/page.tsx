"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Lock, FileText } from "lucide-react";
import { formatRelative } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  content?: unknown;
  updatedAt: string;
  createdBy: { name: string };
};

function PublicDocViewer({ doc }: { doc: Doc }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Link.configure({ openOnClick: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
    ],
    content: doc.content ? (doc.content as object) : "",
    editable: false,
    editorProps: {
      attributes: { class: "doc-editor-content focus:outline-none" },
    },
  });

  if (!editor) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{doc.icon || "📄"}</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{doc.title}</span>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Read only
        </span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="text-4xl mb-3">{doc.icon || "📄"}</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{doc.title}</h1>
        <p className="text-sm text-gray-400 mb-8">
          By {doc.createdBy.name} · Last edited {formatRelative(doc.updatedAt)}
        </p>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default function PublicDocPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/docs/${id}/public`)
      .then((r) => r.json())
      .then(({ data, error: err }) => {
        if (err) setError(err);
        else setDoc(data);
      })
      .catch(() => setError("Failed to load document"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">
          {error || "Document not found"}
        </h1>
        <p className="text-sm text-gray-400">
          This document is private or the link is invalid.
        </p>
      </div>
    );
  }

  return <PublicDocViewer doc={doc} />;
}
