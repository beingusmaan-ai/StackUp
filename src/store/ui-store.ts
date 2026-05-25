import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  taskView: "list" | "kanban" | "calendar";
  setTaskView: (view: "list" | "kanban" | "calendar") => void;
  campaignView: "list" | "kanban" | "gantt";
  setCampaignView: (view: "list" | "kanban" | "gantt") => void;
  expandedDepartments: Record<string, boolean>;
  toggleDepartment: (id: string) => void;
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => void;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      taskView: "list",
      setTaskView: (view) => set({ taskView: view }),
      campaignView: "kanban",
      setCampaignView: (view) => set({ campaignView: view }),
      expandedDepartments: {},
      toggleDepartment: (id) =>
        set((s) => ({
          expandedDepartments: { ...s.expandedDepartments, [id]: !s.expandedDepartments[id] },
        })),
      activeTeamId: null,
      setActiveTeamId: (id) => set({ activeTeamId: id }),
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: "ui-store" }
  )
);
