"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { gapi: any; google: any; OneDrive: any; }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const GOOGLE_CLIENT_ID  = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_API_KEY    = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

interface Props { taskId: string; onClose: () => void; onAdded: () => void; }

export function CloudFilePicker({ taskId, onClose, onAdded }: Props) {
  const [saving, setSaving] = useState(false);

  async function saveFile(
    fileName: string, fileUrl: string, mimeType: string,
    fileSize: number, source: "google_drive" | "onedrive", externalId?: string,
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/cloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileUrl, mimeType, fileSize, source, externalId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${res.status}`);
      toast.success(`${fileName} attached`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach file");
      setSaving(false);
    }
  }

  function showPicker(token: string) {
    window.gapi.load("picker", () => {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY!)
        .setCallback((data: { action: string; docs: Array<{ id: string; name: string; url?: string; mimeType: string; sizeBytes?: number }> }) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const url = doc.url || `https://drive.google.com/file/d/${doc.id}/view`;
            void saveFile(doc.name, url, doc.mimeType, doc.sizeBytes ?? 0, "google_drive", doc.id);
          }
        })
        .build();
      picker.setVisible(true);
    });
  }

  async function openGooglePicker() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      toast.error("Google Drive not configured");
      return;
    }
    try {
      await Promise.all([
        loadScript("https://accounts.google.com/gsi/client"),
        loadScript("https://apis.google.com/js/api.js"),
      ]);

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (resp: { error?: string; access_token: string }) => {
          if (resp.error) { toast.error("Google sign-in failed"); return; }
          showPicker(resp.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      console.error("Google Drive picker error", err);
      toast.error("Google Drive picker failed");
    }
  }

  async function openOneDrivePicker() {
    if (!ONEDRIVE_CLIENT_ID) { toast.error("OneDrive not configured"); return; }
    try {
      await loadScript("https://js.live.net/v7.2/OneDrive.js");
      window.OneDrive.open({
        clientId: ONEDRIVE_CLIENT_ID, action: "share", multiSelect: false,
        success(files: { value: Array<{ id: string; name: string; webUrl: string; "@microsoft.graph.downloadUrl"?: string; file?: { mimeType: string }; size?: number }> }) {
          const f = files.value[0];
          void saveFile(f.name, f["@microsoft.graph.downloadUrl"] ?? f.webUrl, f.file?.mimeType ?? "application/octet-stream", f.size ?? 0, "onedrive", f.id);
        },
        cancel() {},
        error() { toast.error("OneDrive picker error"); },
      });
    } catch (err) {
      console.error("OneDrive picker error", err);
      toast.error("OneDrive picker failed");
    }
  }

  return (
    <div className="border border-border rounded-xl bg-muted/30 p-3.5 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-foreground">Attach from cloud storage</p>
        <button onClick={onClose} className="w-5 h-5 rounded-md hover:bg-muted flex items-center justify-center">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { void openGooglePicker(); }}
          disabled={saving || !GOOGLE_CLIENT_ID}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 disabled:opacity-40 transition-colors text-[12px] font-medium text-foreground"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
            <path fill="#4285F4" d="M6 2l6 10.4L6 22H0L6 2z"/>
            <path fill="#0F9D58" d="M18 2l6 20h-6l-6-10.4L18 2z"/>
            <path fill="#FBBC05" d="M12 12.6L6 22h12l-6-9.4z"/>
          </svg>
          Google Drive
        </button>
        <button
          onClick={() => { void openOneDrivePicker(); }}
          disabled={saving || !ONEDRIVE_CLIENT_ID}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-sky-400 hover:bg-sky-50/60 dark:hover:bg-sky-950/20 disabled:opacity-40 transition-colors text-[12px] font-medium text-foreground"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
            <path fill="#0078D4" d="M12.5 6.5A5.5 5.5 0 0 1 18 12H9A3.5 3.5 0 0 0 5.5 15.5H2.5A5.5 5.5 0 0 1 8 10a5.5 5.5 0 0 1 4.5-3.5z"/>
            <path fill="#0078D4" d="M9 12h9a3 3 0 0 1 3 3H6a3 3 0 0 1 3-3z" opacity=".6"/>
          </svg>
          OneDrive
        </button>
      </div>
      {saving && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
