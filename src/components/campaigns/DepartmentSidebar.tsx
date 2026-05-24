"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Building2, Folder, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { useSession } from "next-auth/react";

interface Department {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  campaigns: { id: string }[];
}

interface DepartmentSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function DepartmentSidebar({ selectedId, onSelect }: DepartmentSidebarProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: session } = useSession();
  const canManage = session?.user?.role !== "TEAM_MEMBER";

  const { data, refetch } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return res.json();
    },
  });

  const departments: Department[] = data?.data || [];

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-1 pr-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left w-full",
          selectedId === null
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <Folder className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">All Campaigns</span>
      </button>

      <div className="mt-2 mb-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Departments</p>
      </div>

      {departments.map((dept) => (
        <button
          key={dept.id}
          onClick={() => onSelect(dept.id)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left w-full group",
            selectedId === dept.id
              ? "bg-gray-900 text-white font-medium"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dept.color }}
          />
          <span className="flex-1 truncate">{dept.name}</span>
          <span className={cn(
            "text-xs flex-shrink-0 transition-colors",
            selectedId === dept.id ? "text-gray-300" : "text-gray-400 group-hover:text-gray-500"
          )}>
            {dept.campaigns.length}
          </span>
          <ChevronRight className={cn(
            "w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
            selectedId === dept.id && "opacity-100"
          )} />
        </button>
      ))}

      {departments.length === 0 && (
        <p className="text-xs text-gray-400 px-3 py-2">No departments yet</p>
      )}

      {canManage && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all mt-1 w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Department</span>
        </button>
      )}

      {showForm && (
        <DepartmentForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
    </aside>
  );
}
