"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "TODO", label: "To Do", dot: "bg-[#a0a0b0]" },
  { id: "ASSIGNED", label: "Assigned", dot: "bg-[#4169e1]" },
  { id: "IN_PROGRESS", label: "In Progress", dot: "bg-[#f59e0b]" },
  { id: "WAITING_APPROVAL", label: "Waiting Approval", dot: "bg-[#8b5cf6]" },
  { id: "REVISION_REQUIRED", label: "Revision", dot: "bg-[#f97316]" },
  { id: "COMPLETED", label: "Completed", dot: "bg-[#10b981]" },
  { id: "BLOCKED", label: "Blocked", dot: "bg-[#ef4444]" },
];

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  campaign?: { name: string } | null;
  assignees: { user: { name: string; image?: string | null } }[];
  _count?: { comments?: number; attachments?: number };
};

function SortableCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <TaskCard task={task} onClick={() => onOpen(task.id)} compact />
    </div>
  );
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskOpen: (id: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskKanbanBoard({ tasks, onTaskOpen, onStatusChange }: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksByStatus = COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const targetColumn = COLUMNS.find((c) => {
      const colTasks = tasksByStatus[c.id] ?? [];
      return colTasks.some((t) => t.id === over.id) || over.id === c.id;
    });

    if (!targetColumn || targetColumn.id === draggedTask.status) return;

    try {
      await onStatusChange(draggedTask.id, targetColumn.id);
    } catch {
      toast.error("Failed to update task status");
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id] ?? [];
          return (
            <div key={col.id} className="flex-shrink-0 w-[260px] flex flex-col">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", col.dot)} />
                <span className="text-[12px] font-semibold text-foreground uppercase tracking-wide">{col.label}</span>
                <span className="text-[11px] text-muted-foreground font-medium ml-1">{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 bg-muted/40 rounded-lg p-2 min-h-[120px]">
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <SortableCard key={task.id} task={task} onOpen={onTaskOpen} />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="h-14 flex items-center justify-center text-[11px] text-muted-foreground/60 border border-dashed border-border rounded-md">
                        Drop here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>

              {/* Add task shortcut */}
              <button className="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                <Plus className="w-3 h-3" />
                Add task
              </button>
            </div>
          );
        })}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} compact />}</DragOverlay>
    </DndContext>
  );
}
