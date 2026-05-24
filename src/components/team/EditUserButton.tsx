"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { UserForm } from "./UserForm";

interface EditUserButtonProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    marketingRole?: string | null;
    department?: string | null;
    isActive: boolean;
  };
}

export function EditUserButton({ user }: EditUserButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
        title="Edit member"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {showForm && (
        <UserForm
          editUser={user}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
