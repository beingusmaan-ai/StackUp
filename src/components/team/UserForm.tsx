"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Department {
  id: string;
  name: string;
  color: string;
}

interface UserFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    marketingRole?: string | null;
    department?: string | null;
    isActive: boolean;
  } | null;
}

export function UserForm({ onClose, onSuccess, editUser }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: editUser?.name || "",
    email: editUser?.email || "",
    password: "",
    role: editUser?.role || "TEAM_MEMBER",
    marketingRole: editUser?.marketingRole || "",
    isActive: editUser?.isActive ?? true,
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data || []));

    if (editUser) {
      fetch(`/api/users/${editUser.id}`)
        .then((r) => r.json())
        .then((d) => {
          const memberships = d.data?.departmentMemberships ?? [];
          setSelectedDeptIds(memberships.map((m: { departmentId: string }) => m.departmentId));
        });
    }
  }, [editUser]);

  function toggleDept(id: string) {
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser && !form.password) { toast.error("Password required"); return; }
    setLoading(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PATCH" : "POST";
      const payload = {
        ...form,
        marketingRole: form.marketingRole || null,
        departmentIds: selectedDeptIds,
        ...(editUser && !form.password && { password: undefined }),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success(editUser ? "User updated" : "User created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">{editUser ? "Edit Member" : "Add Team Member"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              placeholder="John Smith"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              placeholder="john@company.com" disabled={!!editUser}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
          </div>

          {!editUser && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                placeholder="Min 6 characters"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">System Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Job Title</label>
              <input
                value={form.marketingRole}
                onChange={(e) => setForm({ ...form, marketingRole: e.target.value })}
                placeholder="e.g. Account Executive, Developer…"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Teams</label>
              <div className="grid grid-cols-2 gap-2">
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border hover:bg-muted cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDeptIds.includes(dept.id)}
                      onChange={() => toggleDept(dept.id)}
                      className="rounded"
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                    <span className="text-sm font-medium truncate">{dept.name}</span>
                  </label>
                ))}
              </div>
              {selectedDeptIds.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">No team selected — user won't appear in team task assignments</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded" />
            <label htmlFor="isActive" className="text-sm font-medium">Active member</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? "Saving..." : editUser ? "Update" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
