"use client";

// Раздел «Задачи»: полная база задач личного пространства. Виды список/канбан,
// группировки по сроку и по проекту, фильтр «Бэклог» (задачи без дат). Канбан с
// перетаскиванием добавляется отдельным шагом; здесь — список.

import { MoreHorizontal, Phone, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteTask,
  duplicateTaskAction,
  setTaskDone,
  updateTask,
} from "@/app/(workspace)/today/actions";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dateKey } from "@/lib/date";
import type {
  FocusTask,
  FocusTaskPatch,
  TaskFormOptions,
  TaskPriority,
  TaskType,
} from "@/lib/data/tasks";
import { cn } from "@/lib/utils";

type Grouping = "due" | "project";
type View = "list" | "kanban";

type TaskSection = { key: string; label: string; tasks: FocusTask[] };

const priorityMeta: Record<TaskPriority, { className: string; label: string }> = {
  high: { className: "text-red-500", label: "Высокий" },
  low: { className: "text-sky-600", label: "Низкий" },
  medium: { className: "text-amber-600", label: "Средний" },
  none: { className: "", label: "" },
};

const typeMeta: Record<TaskType, { icon: typeof Phone; label: string } | null> = {
  call: { icon: Phone, label: "Созвон" },
  meeting: { icon: Users, label: "Встреча" },
  task: null,
};

const DUE_BUCKETS: { key: string; label: string }[] = [
  { key: "overdue", label: "Просрочено" },
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "week", label: "Ближайшие дни" },
  { key: "later", label: "Позже" },
  { key: "none", label: "Без даты" },
];

function formatDue(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  const label = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return dueTime ? `${label}, ${dueTime.slice(0, 5)}` : label;
}

function dueBucketKey(
  dueDate: string | null,
  today: string,
  tomorrow: string,
  weekEnd: string,
): string {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate === tomorrow) return "tomorrow";
  if (dueDate <= weekEnd) return "week";
  return "later";
}

// Дата, в которую садится задача при перетаскивании в бакет срока.
// ponytail: overdue/week/later — эвристические смещения; точную дату юзер
// доправит в карточке.
function bucketTargetDate(key: string): string | null {
  if (key === "none") return null;
  const offsets: Record<string, number> = {
    overdue: -1,
    today: 0,
    tomorrow: 1,
    week: 3,
    later: 14,
  };
  return dateKey(new Date(Date.now() + (offsets[key] ?? 0) * 86_400_000));
}

// includeEmpty=true возвращает все колонки (даже пустые) — для канбана, чтобы в
// них можно было перетаскивать.
function groupByDue(tasks: FocusTask[], includeEmpty = false): TaskSection[] {
  const today = dateKey();
  const tomorrow = dateKey(new Date(Date.now() + 86_400_000));
  const weekEnd = dateKey(new Date(Date.now() + 7 * 86_400_000));

  const buckets = new Map<string, FocusTask[]>();
  for (const task of tasks) {
    const key = dueBucketKey(task.dueDate, today, tomorrow, weekEnd);
    const list = buckets.get(key) ?? [];
    list.push(task);
    buckets.set(key, list);
  }

  return DUE_BUCKETS.filter(
    (bucket) => includeEmpty || buckets.get(bucket.key)?.length,
  ).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    tasks: buckets.get(bucket.key) ?? [],
  }));
}

function groupByProject(
  tasks: FocusTask[],
  options: TaskFormOptions,
  includeEmpty = false,
): TaskSection[] {
  const nameById = new Map(
    options.projects.map((project) => [project.id, project.name]),
  );
  const withProject = new Map<string, FocusTask[]>();
  const withoutProject: FocusTask[] = [];

  for (const task of tasks) {
    if (task.projectId && nameById.has(task.projectId)) {
      const list = withProject.get(task.projectId) ?? [];
      list.push(task);
      withProject.set(task.projectId, list);
    } else {
      withoutProject.push(task);
    }
  }

  const sections = includeEmpty
    ? options.projects
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
        .map((project) => ({
          key: project.id,
          label: project.name,
          tasks: withProject.get(project.id) ?? [],
        }))
    : [...withProject.entries()]
        .map(([id, list]) => ({
          key: id,
          label: nameById.get(id) ?? "Проект",
          tasks: list,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "ru"));

  if (withoutProject.length > 0 || includeEmpty) {
    sections.push({ key: "none", label: "Без проекта", tasks: withoutProject });
  }

  return sections;
}

function TaskRow({
  task,
  showProject,
  showDue,
  projectName,
  onToggle,
  onOpen,
  onDelete,
  onDragStart,
}: {
  task: FocusTask;
  showProject: boolean;
  showDue: boolean;
  projectName: string | null;
  onToggle: (id: string, done: boolean) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
}) {
  const due = showDue ? formatDue(task.dueDate, task.dueTime) : null;
  const priority = priorityMeta[task.priority];
  const type = typeMeta[task.type];

  return (
    <Card
      draggable={onDragStart !== undefined}
      onDragStart={onDragStart ? () => onDragStart(task.id) : undefined}
      className="relative rounded-2xl bg-card py-0 ring-1 ring-border transition-transform duration-200 hover:-translate-y-0.5">
      <Button
        variant="ghost"
        className="absolute inset-0 z-0 h-full w-full rounded-2xl p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(task.id)}
        aria-label={`Открыть задачу: ${task.title}`}
      />
      <CardContent className="pointer-events-none relative z-10 flex items-start gap-2.5 p-3">
        <div className="pointer-events-auto">
          <Checkbox
            checked={task.checked}
            onCheckedChange={(value) => onToggle(task.id, value === true)}
            className="mt-0.5 size-4 rounded-full"
            aria-label={`Завершить: ${task.title}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] font-medium leading-5 tracking-[-0.01em]",
              task.checked
                ? "text-muted-foreground line-through"
                : "text-foreground",
            )}
          >
            {task.title}
          </p>
          {due || priority.label || type || (showProject && projectName) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {type ? (
                <Badge variant="outline" className="gap-1">
                  <type.icon className="size-3" />
                  {type.label}
                </Badge>
              ) : null}
              {due ? <Badge variant="outline">{due}</Badge> : null}
              {priority.label ? (
                <Badge variant="outline" className={priority.className}>
                  {priority.label}
                </Badge>
              ) : null}
              {showProject && projectName ? (
                <Badge variant="outline">{projectName}</Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="Действия задачи">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  onDelete(task.id);
                }}
              >
                <Trash2 className="size-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksView({
  tasks,
  taskOptions,
}: {
  tasks: FocusTask[];
  taskOptions: TaskFormOptions;
}) {
  const [items, setItems] = useState<FocusTask[]>(tasks);
  const [view, setView] = useState<View>("list");
  const [grouping, setGrouping] = useState<Grouping>("due");
  const [backlogOnly, setBacklogOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draggedId = useRef<string | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const projectNameById = useMemo(
    () => new Map(taskOptions.projects.map((project) => [project.id, project.name])),
    [taskOptions.projects],
  );

  const selectedTask = items.find((task) => task.id === selectedTaskId) ?? null;

  const sections = useMemo(() => {
    const visible = backlogOnly
      ? items.filter((task) => task.dueDate === null)
      : items;
    const includeEmpty = view === "kanban";
    return grouping === "due"
      ? groupByDue(visible, includeEmpty)
      : groupByProject(visible, taskOptions, includeEmpty);
  }, [items, grouping, backlogOnly, taskOptions, view]);

  function handleToggle(id: string, done: boolean) {
    const previous = items.find((task) => task.id === id);
    setItems((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, checked: done, status: done ? "done" : "open" }
          : task,
      ),
    );
    startTransition(async () => {
      const result = await setTaskDone(id, done);
      if (result.error) {
        toast.error(result.error);
        if (previous) {
          setItems((current) =>
            current.map((task) => (task.id === id ? previous : task)),
          );
        }
      }
    });
  }

  function handleDelete(id: string) {
    const previousIndex = items.findIndex((task) => task.id === id);
    const previous = items[previousIndex];
    setItems((prev) => prev.filter((task) => task.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    startTransition(async () => {
      const result = await deleteTask(id);
      if (result.error) {
        toast.error(result.error);
        if (previous) {
          setItems((current) => {
            const restored = [...current];
            restored.splice(Math.max(previousIndex, 0), 0, previous);
            return restored;
          });
        }
      } else {
        toast.success("Задача перемещена в корзину");
      }
    });
  }

  function handleUpdate(id: string, patch: FocusTaskPatch) {
    const previous = items.find((task) => task.id === id);
    if (!previous) return;

    setItems((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );

    startTransition(async () => {
      const result = await updateTask(id, patch);
      if (result.error) {
        toast.error(result.error);
        const rollbackPatch: FocusTaskPatch = {};
        for (const key of Object.keys(patch) as Array<keyof FocusTaskPatch>) {
          Object.assign(rollbackPatch, { [key]: previous[key] });
        }
        setItems((current) =>
          current.map((task) =>
            task.id === id ? { ...task, ...rollbackPatch } : task,
          ),
        );
      } else if (result.task) {
        const updatedTask = result.task;
        setItems((current) =>
          current.map((task) => (task.id === id ? updatedTask : task)),
        );
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateTaskAction(id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.task) {
        const copiedTask = result.task;
        setItems((current) => [copiedTask, ...current]);
        toast.success("Копия задачи создана");
      }
    });
  }

  function handleDrop(columnKey: string) {
    const id = draggedId.current;
    draggedId.current = null;
    if (!id) return;
    const task = items.find((item) => item.id === id);
    if (!task) return;

    if (grouping === "project") {
      const projectId = columnKey === "none" ? null : columnKey;
      if (task.projectId !== projectId) handleUpdate(id, { projectId });
    } else {
      const dueDate = bucketTargetDate(columnKey);
      if (task.dueDate !== dueDate) handleUpdate(id, { dueDate });
    }
  }

  const isEmpty = sections.length === 0;

  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-32 pt-24 sm:pt-28",
        view === "list" ? "max-w-[720px]" : "max-w-[1200px]",
      )}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Задачи</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted p-1">
            {(
              [
                { id: "list", label: "Список" },
                { id: "kanban", label: "Канбан" },
              ] as const
            ).map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                onClick={() => setView(option.id)}
                className={cn(
                  "h-8 rounded-full px-3 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground",
                  view === option.id && "bg-background text-foreground shadow-sm",
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex rounded-full bg-muted p-1">
            {(
              [
                { id: "due", label: "По сроку" },
                { id: "project", label: "По проекту" },
              ] as const
            ).map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                onClick={() => setGrouping(option.id)}
                className={cn(
                  "h-8 rounded-full px-3 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground",
                  grouping === option.id &&
                    "bg-background text-foreground shadow-sm",
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button
            variant={backlogOnly ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-full"
            onClick={() => setBacklogOnly((value) => !value)}
          >
            Бэклог
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-[20px] border border-dashed border-border/70 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {backlogOnly
            ? "В бэклоге пусто — все задачи с датами."
            : "Задач пока нет. Добавьте первую в разделе «Фокус»."}
        </div>
      ) : view === "list" ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <p className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {section.label}
                </p>
                <span className="text-xs text-muted-foreground/70">
                  {section.tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    showProject={grouping !== "project"}
                    showDue={grouping !== "due"}
                    projectName={
                      task.projectId
                        ? projectNameById.get(task.projectId) ?? null
                        : null
                    }
                    onToggle={handleToggle}
                    onOpen={setSelectedTaskId}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sections.map((section) => (
            <div
              key={section.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(section.key)}
              className="flex w-72 shrink-0 flex-col rounded-2xl bg-muted/40 p-2"
            >
              <div className="mb-2 flex items-center gap-2 px-1 pt-1">
                <p className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {section.label}
                </p>
                <span className="text-xs text-muted-foreground/70">
                  {section.tasks.length}
                </span>
              </div>
              <div className="min-h-16 space-y-2">
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    showProject={grouping !== "project"}
                    showDue={grouping !== "due"}
                    projectName={
                      task.projectId
                        ? projectNameById.get(task.projectId) ?? null
                        : null
                    }
                    onToggle={handleToggle}
                    onOpen={setSelectedTaskId}
                    onDelete={handleDelete}
                    onDragStart={(id) => {
                      draggedId.current = id;
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetailDialog
        task={selectedTask}
        options={taskOptions}
        open={selectedTask !== null}
        pending={pending}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedTaskId(null);
        }}
        onUpdate={handleUpdate}
        onToggle={handleToggle}
        onDuplicate={handleDuplicate}
        onTrash={handleDelete}
      />
    </div>
  );
}
