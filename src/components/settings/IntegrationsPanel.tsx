"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { HardDrive, Check, X, Send, Loader2, Trash2, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlackConfig {
  id?: string;
  webhookUrl: string;
  channel: string;
  enabled: boolean;
  notifyOnStatus: boolean;
  notifyOnAssign: boolean;
  notifyOnOverdue: boolean;
}

const DEFAULT: SlackConfig = {
  webhookUrl: "", channel: "", enabled: true,
  notifyOnStatus: true, notifyOnAssign: true, notifyOnOverdue: true,
};

export function IntegrationsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [slack, setSlack] = useState<SlackConfig>(DEFAULT);
  const [hasConfig, setHasConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [digesting, setDigesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailUser, setEmailUser] = useState<string | null>(null);
  const [emailTesting, setEmailTesting] = useState(false);

  const googleConfigured = !!(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID);
  const onedriveConfigured = !!(process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID);

  useEffect(() => {
    fetch("/api/integrations/slack")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setSlack({ ...DEFAULT, ...d.data, webhookUrl: d.data.webhookUrl === "configured" ? "" : (d.data.webhookUrl ?? "") });
          setHasConfig(true);
        }
      })
      .catch(() => {});

    fetch("/api/integrations/email")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setEmailConfigured(d.data.configured);
          setEmailUser(d.data.user ?? null);
        }
      })
      .catch(() => {});
  }, []);

  async function saveSlack() {
    if (!slack.webhookUrl.startsWith("https://hooks.slack.com/")) {
      toast.error("Please enter a valid Slack webhook URL");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slack),
      });
      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* empty body */ }
      if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${res.status}`);
      setHasConfig(true);
      toast.success("Slack integration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Slack config");
    } finally {
      setSaving(false);
    }
  }

  async function testSlack() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/slack/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Test message sent to Slack!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function sendDigest() {
    setDigesting(true);
    try {
      const res = await fetch("/api/integrations/slack/digest", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Daily digest sent — ${json.overdue} overdue, ${json.dueToday} due today`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send digest");
    } finally {
      setDigesting(false);
    }
  }

  async function testEmail() {
    setEmailTesting(true);
    try {
      const res = await fetch("/api/integrations/email/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Test email sent to ${json.to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setEmailTesting(false);
    }
  }

  async function deleteSlack() {
    setDeleting(true);
    try {
      await fetch("/api/integrations/slack", { method: "DELETE" });
      setSlack(DEFAULT);
      setHasConfig(false);
      toast.success("Slack integration removed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* Slack */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4A154B]/10 flex items-center justify-center">
              {/* Slack "S" mark */}
              <svg viewBox="0 0 54 54" className="w-5 h-5">
                <path fill="#E01E5A" d="M19.7 32.9c0 2.7-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9 2.2-4.9 4.9-4.9h4.9v4.9zm2.5 0c0-2.7 2.2-4.9 4.9-4.9s4.9 2.2 4.9 4.9v12.2c0 2.7-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9V32.9z"/>
                <path fill="#36C5F0" d="M27.1 19.7c-2.7 0-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9 4.9 2.2 4.9 4.9v4.9h-4.9zm0 2.5c2.7 0 4.9 2.2 4.9 4.9s-2.2 4.9-4.9 4.9H14.9c-2.7 0-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9h12.2z"/>
                <path fill="#2EB67D" d="M40.3 27.1c0-2.7 2.2-4.9 4.9-4.9s4.9 2.2 4.9 4.9-2.2 4.9-4.9 4.9h-4.9v-4.9zm-2.5 0c0 2.7-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9V14.9c0-2.7 2.2-4.9 4.9-4.9s4.9 2.2 4.9 4.9v12.2z"/>
                <path fill="#ECB22E" d="M32.9 40.3c2.7 0 4.9 2.2 4.9 4.9s-2.2 4.9-4.9 4.9-4.9-2.2-4.9-4.9v-4.9h4.9zm0-2.5c-2.7 0-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9h12.2c2.7 0 4.9 2.2 4.9 4.9s-2.2 4.9-4.9 4.9H32.9z"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Slack Notifications</p>
              <p className="text-[11px] text-muted-foreground">Send task updates to a Slack channel via webhook</p>
            </div>
          </div>
          {hasConfig && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" /> Connected
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {isAdmin ? (
            <>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1.5">Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  value={slack.webhookUrl}
                  onChange={(e) => setSlack((s) => ({ ...s, webhookUrl: e.target.value }))}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#4A154B]/20 focus:border-[#4A154B]/40 transition-all placeholder:text-muted-foreground/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Create at <span className="font-medium">api.slack.com/messaging/webhooks</span> → New App → Incoming Webhooks
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1.5">Channel (optional)</label>
                <input
                  type="text"
                  placeholder="#marketing-alerts"
                  value={slack.channel}
                  onChange={(e) => setSlack((s) => ({ ...s, channel: e.target.value }))}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#4A154B]/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[12px] font-semibold text-foreground">Notify on</p>
                {([
                  { key: "notifyOnStatus",  label: "Task status changes" },
                  { key: "notifyOnAssign",  label: "New task assignments" },
                  { key: "notifyOnOverdue", label: "Include in daily digest" },
                ] as { key: keyof SlackConfig; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => setSlack((s) => ({ ...s, [key]: !s[key] }))}
                      className={cn(
                        "w-8 h-4.5 rounded-full relative transition-colors cursor-pointer flex-shrink-0",
                        slack[key] ? "bg-[#4A154B]" : "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all",
                        slack[key] ? "left-[18px]" : "left-0.5"
                      )} />
                    </div>
                    <span className="text-[13px] text-foreground">{label}</span>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={saveSlack}
                  disabled={saving || !slack.webhookUrl}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#4A154B] hover:bg-[#3b0f3c] disabled:opacity-40 text-white text-[12px] font-semibold rounded-xl transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
                {hasConfig && (
                  <>
                    <button
                      onClick={testSlack}
                      disabled={testing}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border hover:border-[#4A154B]/40 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Test
                    </button>
                    <button
                      onClick={sendDigest}
                      disabled={digesting}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border hover:border-[#4A154B]/40 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                    >
                      {digesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Digest
                    </button>
                    <button
                      onClick={deleteSlack}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-[12px] font-medium rounded-xl transition-colors ml-auto"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {hasConfig ? "Slack notifications are active. Contact an admin to modify settings." : "No Slack integration configured yet. Ask an admin to set it up."}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Email Notifications</p>
              <p className="text-[11px] text-muted-foreground">Send task updates via Gmail to assignees</p>
            </div>
          </div>
          <span className={cn(
            "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full",
            emailConfigured ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-muted-foreground bg-muted"
          )}>
            {emailConfigured ? <><Check className="w-3 h-3" /> Connected</> : <><X className="w-3 h-3" /> Not set</>}
          </span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {emailConfigured ? (
            <>
              <p className="text-[13px] text-muted-foreground">
                Sending as <span className="font-medium text-foreground">{emailUser}</span>. Assignees are emailed on task assignment and status changes.
              </p>
              {isAdmin && (
                <button
                  onClick={testEmail}
                  disabled={emailTesting}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border hover:border-red-300 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                >
                  {emailTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Test Email
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Add these two variables to your <code className="bg-muted px-1 rounded text-[12px]">.env.local</code> and restart the server:
              </p>
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1.5">
                <p className="font-mono text-[12px] text-foreground">EMAIL_USER=your@gmail.com</p>
                <p className="font-mono text-[12px] text-foreground">EMAIL_PASS=xxxx xxxx xxxx xxxx</p>
              </div>
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-1">How to get your Gmail App Password</p>
                <ol className="text-[11px] text-amber-700/80 dark:text-amber-400/80 space-y-0.5 list-decimal pl-4">
                  <li>Go to myaccount.google.com → Security</li>
                  <li>Enable 2-Step Verification (required)</li>
                  <li>Search "App passwords" → create one named "StackUp"</li>
                  <li>Copy the 16-character code as EMAIL_PASS</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cloud Drive */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setDriveOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-foreground">Cloud Storage</p>
              <p className="text-[11px] text-muted-foreground">Attach files from Google Drive or OneDrive to tasks</p>
            </div>
          </div>
          {driveOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {driveOpen && (
          <div className="px-6 pb-5 border-t border-border pt-4 space-y-4">
            {/* Google Drive */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-border flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M6 2l6 10.4L6 22H0L6 2z"/><path fill="#0F9D58" d="M18 2l6 20h-6l-6-10.4L18 2z"/><path fill="#FBBC05" d="M12 12.6L6 22h12l-6-9.4z"/></svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Google Drive</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {googleConfigured ? "Configured — use the file picker on any task" : "Requires NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY in .env.local"}
                  </p>
                </div>
              </div>
              <span className={cn(
                "flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                googleConfigured ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-muted-foreground bg-muted"
              )}>
                {googleConfigured ? <><Check className="w-3 h-3" /> Ready</> : <><X className="w-3 h-3" /> Not set</>}
              </span>
            </div>

            {/* OneDrive */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-border flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#0078D4" d="M12.5 6.5A5.5 5.5 0 0 1 18 12H9A3.5 3.5 0 0 0 5.5 15.5H2.5A5.5 5.5 0 0 1 8 10a5.5 5.5 0 0 1 4.5-3.5z"/><path fill="#0078D4" d="M9 12h9a3 3 0 0 1 3 3H6a3 3 0 0 1 3-3z" opacity=".6"/></svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">OneDrive</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {onedriveConfigured ? "Configured — use the file picker on any task" : "Requires NEXT_PUBLIC_ONEDRIVE_CLIENT_ID in .env.local (Azure App Registration)"}
                  </p>
                </div>
              </div>
              <span className={cn(
                "flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                onedriveConfigured ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-muted-foreground bg-muted"
              )}>
                {onedriveConfigured ? <><Check className="w-3 h-3" /> Ready</> : <><X className="w-3 h-3" /> Not set</>}
              </span>
            </div>

            {(!googleConfigured || !onedriveConfigured) && isAdmin && (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-2">Setup required</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  Add to <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env.local</code>:<br />
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=</code><br />
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=</code><br />
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
