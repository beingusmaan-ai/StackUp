import { create } from "zustand";

type DateRange = "today" | "week" | "month";

interface ReportsState {
  dateRange: DateRange;
  selectedUserId: string;
  selectedDepartmentId: string;
  setDateRange: (range: DateRange) => void;
  setSelectedUserId: (id: string) => void;
  setSelectedDepartmentId: (id: string) => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
  dateRange: "week",
  selectedUserId: "",
  selectedDepartmentId: "",
  setDateRange: (dateRange) => set({ dateRange }),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  setSelectedDepartmentId: (selectedDepartmentId) => set({ selectedDepartmentId }),
}));
