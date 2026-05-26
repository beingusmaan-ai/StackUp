"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PusherJs from "pusher-js";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn, getInitials } from "@/lib/utils";
import { Send, Plus, Search, Users, MessageSquare, X, Check } from "lucide-react";

interface UserInfo { id: string; name: string; image: string | null; marketingRole?: string | null; }
interface Message { id: string; conversationId: string; senderId: string; content: string; createdAt: string; sender: { id: string; name: string; image: string | null }; }
interface Conversation {
  id: string; type: string; name: string | null; teamId: string | null; unread: number;
  members: { userId: string; user: UserInfo }[];
  messages: (Message & { sender: { name: string } })[];
  updatedAt: string;
}

function ConvName(conv: Conversation, myId: string) {
  if (conv.name) return conv.name;
  const other = conv.members.find((m) => m.userId !== myId);
  return other?.user.name ?? "Unknown";
}

function ConvAvatar({ conv, myId }: { conv: Conversation; myId: string }) {
  if (conv.type === "GROUP") return (
    <div className="w-9 h-9 rounded-full bg-[#e8170b]/10 flex items-center justify-center flex-shrink-0">
      <Users className="w-4 h-4 text-[#e8170b]" />
    </div>
  );
  const other = conv.members.find((m) => m.userId !== myId)?.user;
  return <UserAvatar name={other?.name ?? "?"} image={other?.image ?? null} size="sm" />;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserInfo[]>([]);
  const [groupName, setGroupName] = useState("");
  const [newType, setNewType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<PusherJs | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myId = session?.user?.id ?? "";

  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.data ?? []);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => setAllUsers(d.data ?? []));
  }, []);

  // Pusher: subscribe to all conversation channels for real-time messages
  useEffect(() => {
    if (!conversations.length) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      // Fallback: poll every 2.5s if Pusher not configured
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (!activeConvId) return;
      async function poll() {
        const convId = activeConvIdRef.current;
        const lastId = lastMessageIdRef.current;
        if (!convId || !lastId) return;
        try {
          const res = await fetch(`/api/conversations/${convId}/messages?after=${lastId}`);
          const data = await res.json();
          const newMsgs: Message[] = data.data ?? [];
          if (!newMsgs.length) return;
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !ids.has(m.id));
            if (!fresh.length) return prev;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return [...prev, ...fresh];
          });
        } catch { /* silent */ }
      }
      pollTimerRef.current = setInterval(poll, 2500);
      return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
    }

    // Pusher path
    if (!pusherRef.current) {
      pusherRef.current = new PusherJs(key, { cluster });
    }
    const pusher = pusherRef.current;

    conversations.forEach((conv) => {
      const channelName = `conversation-${conv.id}`;
      if (pusher.channel(channelName)) return;
      const channel = pusher.subscribe(channelName);
      channel.bind("new-message", (msg: Message) => {
        const isActive = msg.conversationId === activeConvIdRef.current;
        if (isActive) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          lastMessageIdRef.current = msg.id;
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        setConversations((prev) =>
          prev.map((c) => c.id === msg.conversationId
            ? { ...c, messages: [msg], updatedAt: msg.createdAt, unread: isActive ? 0 : c.unread + 1 }
            : c
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      });
    });

    return () => { pusherRef.current?.disconnect(); pusherRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, activeConvId]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeConvId) return;
    setMessages([]);
    setHasMore(false);
    lastMessageIdRef.current = null;
    fetch(`/api/conversations/${activeConvId}/messages`)
      .then((r) => r.json())
      .then((d) => {
        const fetched: Message[] = d.data ?? [];
        setMessages(fetched);
        setHasMore(fetched.length === 50);
        if (fetched.length) lastMessageIdRef.current = fetched[fetched.length - 1].id;
        setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, unread: 0 } : c));
      });
  }, [activeConvId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConvId]);

  async function loadOlderMessages() {
    if (!activeConvId || loadingMore || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingMore(true);
    const container = threadRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages?cursor=${oldest.id}`);
      const d = await res.json();
      const older: Message[] = d.data ?? [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === 50);
      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function handleThreadScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 60) loadOlderMessages();
  }

  async function sendMessage() {
    if (!input.trim() || !activeConvId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistic update — show message instantly
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversationId: activeConvId,
      senderId: myId,
      content,
      createdAt: new Date().toISOString(),
      sender: { id: myId, name: session?.user?.name ?? "You", image: session?.user?.image ?? null },
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      // Replace optimistic message with real one from server
      if (data.data) {
        lastMessageIdRef.current = data.data.id;
        setMessages((prev) => prev.map((m) => m.id === optimisticId ? data.data : m));
      }
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function startConversation() {
    if (!selectedUsers.length) return;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newType,
        memberIds: selectedUsers.map((u) => u.id),
        name: newType === "GROUP" ? (groupName || null) : null,
      }),
    });
    const data = await res.json();
    const conv = data.data;
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    setActiveConvId(conv.id);
    setShowNew(false);
    setSelectedUsers([]);
    setGroupName("");
    setUserSearch("");
  }

  const filtered = conversations.filter((c) =>
    ConvName(c, myId).toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;
  const filteredUsers = allUsers.filter(
    (u) => u.id !== myId && u.name.toLowerCase().includes(userSearch.toLowerCase()) && !selectedUsers.find((s) => s.id === u.id)
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="flex h-[calc(100vh-64px)] -mt-6 -mx-6 overflow-hidden">

      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
              Messages
              {totalUnread > 0 && (
                <span className="bg-[#e8170b] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalUnread}</span>
              )}
            </h2>
            <button onClick={() => setShowNew(true)} className="w-7 h-7 rounded-lg bg-[#e8170b] flex items-center justify-center hover:bg-[#c91409] transition-colors">
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-[12px] outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-[12px] text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const last = conv.messages[0];
              const isActive = activeConvId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/50", isActive ? "bg-[#e8170b]/5" : "hover:bg-muted/50")}
                >
                  <ConvAvatar conv={conv} myId={myId} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[13px] truncate", conv.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground")}>{ConvName(conv, myId)}</p>
                      {last && <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{new Date(last.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    <p className={cn("text-[11px] truncate mt-0.5", conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {last ? `${last.sender.name === session?.user?.name ? "You" : last.sender.name}: ${last.content}` : "No messages yet"}
                    </p>
                  </div>
                  {conv.unread > 0 && <span className="bg-[#e8170b] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">{conv.unread}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground opacity-20" />
            <p className="text-[14px] font-semibold text-foreground">Select a conversation</p>
            <p className="text-[12px] text-muted-foreground mt-1">Or start a new one with the + button</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-card">
              <ConvAvatar conv={activeConv} myId={myId} />
              <div>
                <p className="text-[14px] font-semibold text-foreground">{ConvName(activeConv, myId)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {activeConv.type === "GROUP"
                    ? `${activeConv.members.length} members`
                    : activeConv.members.find((m) => m.userId !== myId)?.user.marketingRole ?? ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={threadRef} onScroll={handleThreadScroll} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <span className="text-[11px] text-muted-foreground animate-pulse">Loading older messages…</span>
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-2">Beginning of conversation</p>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === myId;
                const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={cn("flex gap-2 items-end", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && <UserAvatar name={msg.sender.name} image={msg.sender.image} size="xs" />}
                      </div>
                    )}
                    <div className={cn("max-w-[65%] flex flex-col", isMe ? "items-end" : "items-start")}>
                      {showAvatar && !isMe && (
                        <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.sender.name}</span>
                      )}
                      <div className={cn("px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed", isMe ? "bg-[#e8170b] text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-card">
              <div className="flex items-end gap-2 bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-[#e8170b]/40 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-32"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="w-7 h-7 rounded-lg bg-[#e8170b] flex items-center justify-center disabled:opacity-40 hover:bg-[#c91409] transition-colors flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-[15px] font-semibold">New Conversation</h3>
              <button onClick={() => { setShowNew(false); setSelectedUsers([]); setUserSearch(""); setGroupName(""); }} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["DIRECT", "GROUP"] as const).map((t) => (
                  <button key={t} onClick={() => setNewType(t)} className={cn("flex-1 py-2 text-[12px] font-medium transition-colors", newType === t ? "bg-[#e8170b] text-white" : "bg-background text-muted-foreground hover:bg-muted")}>
                    {t === "DIRECT" ? "Direct Message" : "Group Chat"}
                  </button>
                ))}
              </div>

              {newType === "GROUP" && (
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (optional)" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-[#e8170b]/40" />
              )}

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span key={u.id} className="flex items-center gap-1 bg-[#e8170b]/10 text-[#e8170b] text-[11px] font-medium px-2 py-1 rounded-full">
                      {u.name}
                      <button onClick={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search users */}
              <div className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search team members…" className="flex-1 bg-transparent text-[12px] outline-none" />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredUsers.map((u) => (
                  <button key={u.id} onClick={() => { if (newType === "DIRECT") { setSelectedUsers([u]); } else { setSelectedUsers((prev) => [...prev, u]); } }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted text-left transition-colors">
                    <UserAvatar name={u.name} image={u.image} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{u.name}</p>
                      {u.marketingRole && <p className="text-[10px] text-muted-foreground truncate">{u.marketingRole}</p>}
                    </div>
                    {selectedUsers.find((s) => s.id === u.id) && <Check className="w-3.5 h-3.5 text-[#e8170b]" />}
                  </button>
                ))}
              </div>

              <button
                onClick={startConversation}
                disabled={!selectedUsers.length}
                className="w-full py-2.5 rounded-xl bg-[#e8170b] text-white text-[13px] font-semibold disabled:opacity-40 hover:bg-[#c91409] transition-colors"
              >
                {newType === "DIRECT" ? "Open Chat" : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
