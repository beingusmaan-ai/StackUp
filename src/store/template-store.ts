import { create } from "zustand";

const uid = () => Math.random().toString(36).slice(2, 10);

export interface BuilderChecklistItem {
  id: string;
  text: string;
}

export interface BuilderTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  assignedRole: string;
  priority: string;
  estimatedHours: string;
  dayOffset: string;
  checklist: BuilderChecklistItem[];
}

export interface BuilderGroup {
  id: string;
  name: string;
  color: string;
  tasks: BuilderTask[];
}

export interface BuilderMeta {
  name: string;
  description: string;
  category: string;
  departmentId: string;
  defaultPriority: string;
  estimatedDays: string;
  tags: string;
}

const DEFAULT_META: BuilderMeta = {
  name: "",
  description: "",
  category: "CUSTOM",
  departmentId: "",
  defaultPriority: "MEDIUM",
  estimatedDays: "",
  tags: "",
};

function newTask(): BuilderTask {
  return {
    id: uid(),
    title: "",
    description: "",
    taskType: "",
    assignedRole: "",
    priority: "MEDIUM",
    estimatedHours: "",
    dayOffset: "",
    checklist: [],
  };
}

function newGroup(name = "New Group"): BuilderGroup {
  return { id: uid(), name, color: "#6366f1", tasks: [newTask()] };
}

interface TemplateStore {
  meta: BuilderMeta;
  groups: BuilderGroup[];
  isDirty: boolean;
  expandedTaskIds: Set<string>;

  setMeta: (patch: Partial<BuilderMeta>) => void;

  addGroup: () => void;
  removeGroup: (gid: string) => void;
  updateGroup: (gid: string, patch: Partial<Pick<BuilderGroup, "name" | "color">>) => void;
  moveGroup: (gid: string, dir: "up" | "down") => void;

  addTask: (gid: string) => void;
  removeTask: (gid: string, tid: string) => void;
  updateTask: (gid: string, tid: string, patch: Partial<BuilderTask>) => void;
  moveTask: (gid: string, tid: string, dir: "up" | "down") => void;
  toggleTaskExpand: (tid: string) => void;

  addChecklistItem: (gid: string, tid: string) => void;
  updateChecklistItem: (gid: string, tid: string, itemId: string, text: string) => void;
  removeChecklistItem: (gid: string, tid: string, itemId: string) => void;

  load: (meta: BuilderMeta, groups: BuilderGroup[]) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateStore>()((set) => ({
  meta: DEFAULT_META,
  groups: [newGroup("Tasks")],
  isDirty: false,
  expandedTaskIds: new Set(),

  setMeta: (patch) =>
    set((s) => ({ meta: { ...s.meta, ...patch }, isDirty: true })),

  addGroup: () =>
    set((s) => ({ groups: [...s.groups, newGroup()], isDirty: true })),

  removeGroup: (gid) =>
    set((s) => ({ groups: s.groups.filter((g) => g.id !== gid), isDirty: true })),

  updateGroup: (gid, patch) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === gid ? { ...g, ...patch } : g)),
      isDirty: true,
    })),

  moveGroup: (gid, dir) =>
    set((s) => {
      const idx = s.groups.findIndex((g) => g.id === gid);
      if (idx < 0) return s;
      const next = dir === "up" ? idx - 1 : idx + 1;
      if (next < 0 || next >= s.groups.length) return s;
      const arr = [...s.groups];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { groups: arr, isDirty: true };
    }),

  addTask: (gid) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid ? { ...g, tasks: [...g.tasks, newTask()] } : g
      ),
      isDirty: true,
    })),

  removeTask: (gid, tid) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid ? { ...g, tasks: g.tasks.filter((t) => t.id !== tid) } : g
      ),
      isDirty: true,
    })),

  updateTask: (gid, tid, patch) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid
          ? { ...g, tasks: g.tasks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }
          : g
      ),
      isDirty: true,
    })),

  moveTask: (gid, tid, dir) =>
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== gid) return g;
        const idx = g.tasks.findIndex((t) => t.id === tid);
        if (idx < 0) return g;
        const next = dir === "up" ? idx - 1 : idx + 1;
        if (next < 0 || next >= g.tasks.length) return g;
        const arr = [...g.tasks];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        return { ...g, tasks: arr };
      }),
      isDirty: true,
    })),

  toggleTaskExpand: (tid) =>
    set((s) => {
      const next = new Set(s.expandedTaskIds);
      next.has(tid) ? next.delete(tid) : next.add(tid);
      return { expandedTaskIds: next };
    }),

  addChecklistItem: (gid, tid) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === tid
                  ? { ...t, checklist: [...t.checklist, { id: uid(), text: "" }] }
                  : t
              ),
            }
          : g
      ),
      isDirty: true,
    })),

  updateChecklistItem: (gid, tid, itemId, text) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      checklist: t.checklist.map((c) =>
                        c.id === itemId ? { ...c, text } : c
                      ),
                    }
                  : t
              ),
            }
          : g
      ),
      isDirty: true,
    })),

  removeChecklistItem: (gid, tid, itemId) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === gid
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === tid
                  ? { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) }
                  : t
              ),
            }
          : g
      ),
      isDirty: true,
    })),

  load: (meta, groups) => set({ meta, groups, isDirty: false, expandedTaskIds: new Set() }),

  reset: () =>
    set({ meta: DEFAULT_META, groups: [newGroup("Tasks")], isDirty: false, expandedTaskIds: new Set() }),
}));
