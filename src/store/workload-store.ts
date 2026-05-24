import { create } from "zustand";

interface WorkloadStore {
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
  departmentFilter: string;
  setDepartmentFilter: (d: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useWorkloadStore = create<WorkloadStore>()((set) => ({
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  departmentFilter: "",
  setDepartmentFilter: (d) => set({ departmentFilter: d }),
  statusFilter: "",
  setStatusFilter: (s) => set({ statusFilter: s }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
