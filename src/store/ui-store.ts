import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  taskView: "list" | "kanban" | "calendar";
  setTaskView: (view: "list" | "kanban" | "calendar") => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      taskView: "list",
      setTaskView: (view) => set({ taskView: view }),
    }),
    { name: "ui-store" }
  )
);
