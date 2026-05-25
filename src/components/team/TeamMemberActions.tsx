"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { UserForm } from "./UserForm";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { useQueryClient } from "@tanstack/react-query";

interface TeamMemberActionsProps {
  onMutate?: () => void;
  isGlobalAdmin?: boolean;
  isDeptAdmin?: boolean;
  adminDeptIds?: string[];
}

export function TeamMemberActions({ onMutate, isGlobalAdmin, isDeptAdmin, adminDeptIds }: TeamMemberActionsProps) {
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <div className="flex items-center gap-2">
        {isGlobalAdmin && (
          <button
            onClick={() => setShowTeamForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-muted text-foreground rounded-md text-[13px] font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            New Team
          </button>
        )}
        <button
          onClick={() => setShowMemberForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-md text-[13px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {showMemberForm && (
        <UserForm
          isDeptAdmin={isDeptAdmin}
          adminDeptIds={adminDeptIds}
          onClose={() => setShowMemberForm(false)}
          onSuccess={() => {
            setShowMemberForm(false);
            queryClient.invalidateQueries({ queryKey: ["users"] });
            onMutate?.();
          }}
        />
      )}

      {showTeamForm && (
        <DepartmentForm
          onClose={() => setShowTeamForm(false)}
          onSuccess={() => {
            setShowTeamForm(false);
            onMutate?.();
          }}
        />
      )}
    </>
  );
}
