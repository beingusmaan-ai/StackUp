"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface User { id: string; name: string; image?: string | null; email?: string }

interface MemberPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allUsers: User[];
}

function Avatar({ user, size = "sm" }: { user: User; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  if (user.image) return <img src={user.image} alt={user.name} className={cn("rounded-full object-cover flex-shrink-0", s)} />;
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-red-500","bg-blue-500","bg-green-500","bg-purple-500","bg-orange-500","bg-pink-500"];
  const color = colors[user.name.charCodeAt(0) % colors.length];
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0", s, color)}>
      {initials}
    </div>
  );
}

export function MemberPicker({ selectedIds, onChange, allUsers }: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = allUsers.filter(
    (u) =>
      !selectedIds.includes(u.id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = allUsers.filter((u) => selectedIds.includes(u.id));

  function add(id: string) { onChange([...selectedIds, id]); setSearch(""); }
  function remove(id: string) { onChange(selectedIds.filter((x) => x !== id)); }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        Invite Members
        <span className="text-xs text-muted-foreground font-normal">(only invited members can see this project)</span>
      </label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((u) => (
            <div key={u.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg text-xs">
              <Avatar user={u} size="sm" />
              <span className="font-medium">{u.name}</span>
              <button
                type="button"
                onClick={() => remove(u.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={ref} className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-[#e8170b] transition-all">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? "Search and add team members…" : "Add more members…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {open && (search.length > 0 || filtered.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                {search ? "No users found" : "All users already added"}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto py-1">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => add(u.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <Avatar user={u} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          Leave empty to make the project visible to everyone.
        </p>
      )}
    </div>
  );
}
