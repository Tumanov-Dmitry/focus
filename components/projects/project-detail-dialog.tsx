"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addStatusAction,
  createProjectTaskAction,
  deleteStatusAction,
  loadProjectAction,
  reorderStatusesAction,
  updateProjectAction,
  updateStatusAction,
  type ProjectPatch,
} from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProjectDetail,
  ProjectStatus,
  StatusCategory,
} from "@/lib/data/projects";
import type { FocusTask } from "@/lib/data/tasks";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  done: "Готово",
  in_progress: "В процессе",
  not_started: "Не начато",
};

const LIFECYCLE_LABELS: Record<ProjectDetail["lifecycle"], string> = {
  active: "Активен",
  archived: "В архиве",
  completed: "Завершён",
};

const fieldClass =
  "text-sm h-9 w-full rounded-md border bg-background px-3";

export function ProjectDetailDialog({
  projectId,
  onClose,
  onChanged,
}: {
  projectId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reassignFor, setReassignFor] = useState<ProjectStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    if (!projectId) {
      setDetail(null);
      setTasks([]);
      return;
    }
    setLoading(true);
    loadProjectAction(projectId)
      .then((result) => {
        if (result.error || !result.detail) {
          toast.error(result.error ?? "Не удалось загрузить проект.");
          onClose();
          return;
        }
        setDetail(result.detail);
        setTasks(result.tasks ?? []);
      })
      .finally(() => setLoading(false));
  }, [projectId, onClose]);

  function reload() {
    if (!projectId) return;
    loadProjectAction(projectId).then((result) => {
      if (result.detail) {
        setDetail(result.detail);
        setTasks(result.tasks ?? []);
      }
    });
    onChanged();
  }

  function saveProject(patch: ProjectPatch) {
    if (!detail) return;
    startTransition(async () => {
      const result = await updateProjectAction(detail.id, patch);
      if (result.error) toast.error(result.error);
      else reload();
    });
  }

  function addStatus() {
    const name = newStatusName.trim();
    if (!name || !detail) return;
    setNewStatusName("");
    startTransition(async () => {
      const result = await addStatusAction(detail.id, name, "in_progress");
      if (result.error) toast.error(result.error);
      else reload();
    });
  }

  function saveStatus(id: string, input: { category?: StatusCategory; name?: string }) {
    startTransition(async () => {
      const result = await updateStatusAction(id, input);
      if (result.error) toast.error(result.error);
      else reload();
    });
  }

  function moveStatus(index: number, delta: number) {
    if (!detail) return;
    const next = [...detail.statuses];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDetail({ ...detail, statuses: next });
    startTransition(async () => {
      const result = await reorderStatusesAction(detail.id, next.map((s) => s.id));
      if (result.error) toast.error(result.error);
      else onChanged();
    });
  }

  function confirmDeleteStatus(targetId: string | null) {
    if (!reassignFor) return;
    const status = reassignFor;
    setReassignFor(null);
    startTransition(async () => {
      const result = await deleteStatusAction(status.id, targetId);
      if (result.error) toast.error(result.error);
      else reload();
    });
  }

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title || !detail) return;
    setNewTaskTitle("");
    startTransition(async () => {
      const result = await createProjectTaskAction(detail.id, title);
      if (result.error) toast.error(result.error);
      else reload();
    });
  }

  const doneCount = detail?.statuses.filter((s) => s.category === "done").length ?? 0;

  return (
    <Dialog open={projectId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        // Native <select>/<input type="date"> open browser overlays that Radix
        // treats as an outside click and would close the dialog. Keep it open;
        // the X button and Escape still close it.
        onInteractOutside={(event) => event.preventDefault()}
      >
        {loading || !detail ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Карточка проекта</DialogTitle>
              <DialogDescription className="sr-only">
                Редактирование проекта, статусов и задач
              </DialogDescription>
              <Input
                defaultValue={detail.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== detail.name) {
                    saveProject({ name: e.target.value });
                  }
                }}
                className="h-auto border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              />
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                defaultValue={detail.description ?? ""}
                placeholder="Описание проекта"
                onBlur={(e) => {
                  if ((e.target.value || null) !== detail.description) {
                    saveProject({ description: e.target.value });
                  }
                }}
                className="min-h-16 text-sm"
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Начало
                  <input
                    type="date"
                    defaultValue={detail.startDate ?? ""}
                    onChange={(e) => saveProject({ startDate: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Конец
                  <input
                    type="date"
                    defaultValue={detail.endDate ?? ""}
                    onChange={(e) => saveProject({ endDate: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Сумма, ₽
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={detail.amount ?? ""}
                    onBlur={(e) =>
                      saveProject({ amount: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Статус
                  <select
                    defaultValue={detail.lifecycle}
                    onChange={(e) =>
                      saveProject({ lifecycle: e.target.value as ProjectDetail["lifecycle"] })
                    }
                    className={fieldClass}
                  >
                    {(["active", "completed", "archived"] as const).map((value) => (
                      <option key={value} value={value}>
                        {LIFECYCLE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Статусы задач</h3>
                {detail.statuses.map((status, index) => (
                  <div key={status.id} className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <Input
                      defaultValue={status.name}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== status.name) {
                          saveStatus(status.id, { name: e.target.value });
                        }
                      }}
                      className="h-8 flex-1"
                    />
                    <select
                      value={status.category}
                      onChange={(e) =>
                        saveStatus(status.id, { category: e.target.value as StatusCategory })
                      }
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      {(["not_started", "in_progress", "done"] as const).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0}
                      onClick={() => moveStatus(index, -1)}
                      aria-label="Выше"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === detail.statuses.length - 1}
                      onClick={() => moveStatus(index, 1)}
                      aria-label="Ниже"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={status.category === "done" && doneCount <= 1}
                      title={
                        status.category === "done" && doneCount <= 1
                          ? "Нельзя удалить последний статус «Готово»"
                          : "Удалить статус"
                      }
                      onClick={() => setReassignFor(status)}
                      aria-label="Удалить статус"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}

                {reassignFor ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <p className="mb-2">
                      Удалить статус «{reassignFor.name}». Перенести его задачи на:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.statuses
                        .filter((s) => s.id !== reassignFor.id)
                        .map((s) => (
                          <Button
                            key={s.id}
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDeleteStatus(s.id)}
                          >
                            {s.name}
                          </Button>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDeleteStatus(null)}
                      >
                        Без статуса
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setReassignFor(null)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
                      placeholder="Новый статус"
                      className="h-8 flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={addStatus} disabled={pending}>
                      <Plus className="size-3.5" /> Статус
                    </Button>
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Задачи проекта <span className="text-muted-foreground">({tasks.length})</span>
                </h3>
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          task.checked ? "bg-emerald-500" : "bg-muted-foreground/40",
                        )}
                      />
                      <span className={cn("flex-1", task.checked && "text-muted-foreground line-through")}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                    placeholder="Новая задача проекта"
                    className="h-8 flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addTask} disabled={pending}>
                    <Plus className="size-3.5" /> Задача
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
