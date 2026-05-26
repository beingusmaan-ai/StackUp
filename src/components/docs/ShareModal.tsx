"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Link2, Copy, Check, Globe, Lock, UserPlus, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";

type ShareUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};
type DocShare = {
  id: string;
  userId: string;
  role: string;
  user: ShareUser;
};
type User = { id: string; name: string; email: string; image?: string | null };

interface ShareModalProps {
  docId: string;
  docTitle: string;
  isPublic: boolean;
  createdBy: { name: string };
  onClose: () => void;
  onPublicToggle: (isPublic: boolean) => void;
}

export function ShareModal({ docId, docTitle, isPublic, createdBy, onClose, onPublicToggle }: ShareModalProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);

  const shareLink = typeof window !== "undefined"
    ? `${window.location.origin}/share/docs/${docId}`
    : "";

  const { data: sharesData, isLoading: sharesLoading } = useQuery({
    queryKey: ["doc-shares", docId],
    queryFn: async () => {
      const res = await fetch(`/api/docs/${docId}/shares`);
      return res.json();
    },
  });
  const shares: DocShare[] = sharesData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: async () => {
      const res = await fetch("/api/users?activeOnly=true");
      return res.json();
    },
  });
  const allUsers: User[] = usersData?.data || [];

  const sharedUserIds = new Set(shares.map((s) => s.userId));
  const filteredUsers = search.length > 0
    ? allUsers.filter(
        (u) =>
          !sharedUserIds.has(u.id) &&
          (u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 6)
    : [];

  const addShare = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/docs/${docId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-shares", docId] });
      setSearch("");
      setSelectedUser(null);
      toast.success("Access granted");
    },
    onError: () => toast.error("Failed to share"),
  });

  const removeShare = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/docs/${docId}/shares`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-shares", docId] });
      toast.success("Access removed");
    },
    onError: () => toast.error("Failed to remove access"),
  });

  async function togglePublic() {
    setPublicLoading(true);
    try {
      await fetch(`/api/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      onPublicToggle(!isPublic);
      toast.success(!isPublic ? "Link sharing enabled" : "Link sharing disabled");
    } catch {
      toast.error("Failed to update");
    } finally {
      setPublicLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Share &ldquo;{docTitle}&rdquo;</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Share link */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Share link</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted text-sm text-muted-foreground overflow-hidden">
                <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate text-xs">{shareLink}</span>
              </div>
              <button
                onClick={copyLink}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0",
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-[#e8170b] hover:bg-[#c91409] text-white"
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Public toggle */}
            <div className="flex items-center justify-between mt-3 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-2.5">
                {isPublic ? <Globe className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isPublic ? "Anyone with the link can view" : "Only invited people can access"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPublic ? "Public — no login required" : "Private — login required"}
                  </p>
                </div>
              </div>
              <button
                onClick={togglePublic}
                disabled={publicLoading}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50",
                  isPublic ? "bg-green-500" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  isPublic ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>
          </div>

          {/* Invite people */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invite people</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  value={selectedUser ? selectedUser.name : search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search by name or email…"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                />
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setSearch(""); setShowUserDropdown(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
                      >
                        <UserAvatar name={u.name} image={u.image} size="xs" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Role selector */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu((v) => !v)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-muted text-sm text-foreground hover:border-foreground/30 transition-colors"
                >
                  {selectedRole === "VIEWER" ? "Viewer" : "Editor"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showRoleMenu && (
                  <div className="absolute right-0 top-full mt-1 w-28 bg-background border border-border rounded-xl shadow-lg z-20 py-1">
                    {(["VIEWER", "EDITOR"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => { setSelectedRole(r); setShowRoleMenu(false); }}
                        className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors", selectedRole === r && "text-[#e8170b] font-medium")}
                      >
                        {r === "VIEWER" ? "Viewer" : "Editor"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => selectedUser && addShare.mutate({ userId: selectedUser.id, role: selectedRole })}
                disabled={!selectedUser || addShare.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors flex-shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite
              </button>
            </div>
          </div>

          {/* People with access */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">People with access</p>
            <div className="space-y-1">
              {/* Owner */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
                <UserAvatar name={createdBy.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{createdBy.name}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Owner</span>
              </div>

              {/* Shared users */}
              {sharesLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
              ) : (
                shares.map((share) => (
                  <div key={share.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 group">
                    <UserAvatar name={share.user.name} image={share.user.image} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{share.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{share.user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{share.role === "EDITOR" ? "Editor" : "Viewer"}</span>
                    <button
                      onClick={() => removeShare.mutate(share.userId)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500"
                      title="Remove access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
