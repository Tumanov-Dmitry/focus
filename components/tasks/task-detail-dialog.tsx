"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Flag,
  FolderKanban,
  ListChecks,
  Phone,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { TaskExtrasPanel } from "@/components/tasks/task-extras-panel";
import { TaskSchedulePicker } from "@/components/tasks/task-schedule-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  FocusTask,
  FocusTaskPatch,
  TaskFormOptions,
  TaskPriority,
  TaskType,
} from "@/lib/data/tasks";

type TaskDetailDialogProps = {
  onDuplicate: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string, done: boolean) => void;
  onTrash: (id: string) => void;
  onUpdate: (id: string, patch: FocusTaskPatch) => void;
  open: boolean;
  options: TaskFormOptions;
  pending: boolean;
  task: FocusTask | null;
};

const typeOptions: Array<{
  icon: typeof CheckCircle2;
  label: string;
  value: TaskType;
}> = [
  { icon: CheckCircle2, label: "Задача", value: "task" },
  { icon: Phone, label: "Созвон", value: "call" },
  { icon: Users, label: "Встреча", value: "meeting" },
];

const priorityOptions: Array<{
  className: string;
  label: string;
  value: TaskPriority;
}> = [
  { className: "text-muted-foreground", label: "Без приоритета", value: "none" },
  { className: "text-sky-600", label: "Низкий", value: "low" },
  { className: "text-amber-600", label: "Средний", value: "medium" },
  { className: "text-red-500", label: "Высокий", value: "high" },
];

function typeLabel(type: TaskType): string {
  return typeOptions.find((option) => option.value === type)?.label ?? "Задача";
}

function priorityLabel(priority: TaskPriority): string {
  return (
    priorityOptions.find((option) => option.value === priority)?.label ??
    "Без приоритета"
  );
}

export function TaskDetailDialog({
  onDuplicate,
  onOpenChange,
  onToggle,
  onTrash,
  onUpdate,
  open,
  options,
  pending,
  task,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState("");

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setEstimate(task?.estimateMinutes?.toString() ?? "");
  }, [task?.description, task?.estimateMinutes, task?.id, task?.title]);

  if (!task) return null;
  const currentTask = task;

  const statuses = options.statuses.filter(
    (status) => status.spaceId === task.spaceId,
  );
  const projects = options.projects.filter(
    (project) => project.spaceId === task.spaceId,
  );
  const selectedStatus = statuses.find((status) => status.id === task.statusId);
  const selectedProject = projects.find(
    (project) => project.id === task.projectId,
  );

  function saveTitle() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitle(currentTask.title);
      return;
    }
    if (nextTitle !== currentTask.title) {
      onUpdate(currentTask.id, { title: nextTitle });
    }
  }

  function saveDescription() {
    const nextDescription = description.trim() || null;
    if (nextDescription !== currentTask.description) {
      onUpdate(currentTask.id, { description: nextDescription });
    }
  }

  function saveEstimate() {
    const nextEstimate = estimate.trim() ? Number(estimate) : null;
    if (
      nextEstimate !== null &&
      (!Number.isInteger(nextEstimate) || nextEstimate < 0)
    ) {
      setEstimate(currentTask.estimateMinutes?.toString() ?? "");
      return;
    }
    if (nextEstimate !== currentTask.estimateMinutes) {
      onUpdate(currentTask.id, { estimateMinutes: nextEstimate });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(880px,calc(100vh-24px))] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[880px]"
        overlayClassName="bg-black/20 backdrop-blur-md"
      >
        <DialogHeader className="border-b px-6 pb-5 pt-6 pr-16 sm:px-8 sm:pt-8">
          <DialogTitle className="sr-only">Карточка задачи</DialogTitle>
          <DialogDescription className="sr-only">
            Редактирование параметров выбранной задачи
          </DialogDescription>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-7 gap-1.5 bg-background px-2.5">
              <ListChecks className="size-3.5" />
              Карточка задачи
            </Badge>
            {task.checked ? (
              <Badge className="h-7 bg-emerald-600 px-2.5 text-white">
                <Check className="size-3.5" />
                Выполнено
              </Badge>
            ) : null}
          </div>

          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setTitle(task.title);
                event.currentTarget.blur();
              }
            }}
            className={cn(
              "h-auto border-0 bg-transparent p-0 text-2xl font-semibold leading-tight tracking-[-0.04em] shadow-none focus-visible:ring-0 sm:text-[32px]",
              task.checked && "text-muted-foreground line-through",
            )}
            aria-label="Название задачи"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  {typeLabel(task.type)}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Тип</DropdownMenuLabel>
                {typeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => onUpdate(task.id, { type: option.value })}
                    >
                      <Icon className="size-4" />
                      {option.label}
                      {task.type === option.value ? (
                        <Check className="ml-auto size-4" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Flag
                    className={cn(
                      "size-3.5",
                      priorityOptions.find(
                        (option) => option.value === task.priority,
                      )?.className,
                    )}
                  />
                  {priorityLabel(task.priority)}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Приоритет</DropdownMenuLabel>
                {priorityOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() =>
                      onUpdate(task.id, { priority: option.value })
                    }
                  >
                    <Flag className={cn("size-4", option.className)} />
                    {option.label}
                    {task.priority === option.value ? (
                      <Check className="ml-auto size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <span
                    className="size-2 rounded-full bg-muted-foreground"
                    style={{
                      backgroundColor: selectedStatus?.color,
                    }}
                  />
                  {selectedStatus?.name ?? "Без статуса"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Статус</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => onUpdate(task.id, { statusId: null })}
                >
                  <span className="size-2 rounded-full bg-muted-foreground" />
                  Без статуса
                </DropdownMenuItem>
                {statuses.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onSelect={() =>
                      onUpdate(task.id, { statusId: status.id })
                    }
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                    {task.statusId === status.id ? (
                      <Check className="ml-auto size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <FolderKanban className="size-3.5" />
                  {selectedProject?.name ?? "Без проекта"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Проект</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => onUpdate(task.id, { projectId: null })}
                >
                  Без проекта
                </DropdownMenuItem>
                {projects.length > 0 ? <DropdownMenuSeparator /> : null}
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onSelect={() =>
                      onUpdate(task.id, { projectId: project.id })
                    }
                  >
                    <FolderKanban className="size-4" />
                    {project.name}
                    {task.projectId === project.id ? (
                      <Check className="ml-auto size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-7 p-6 sm:p-8">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Описание</h3>
                <span className="text-xs text-muted-foreground">Markdown</span>
              </div>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={saveDescription}
                placeholder="Добавьте контекст, ожидаемый результат или важные детали…"
                className="min-h-36 bg-background/70 text-[15px] leading-6"
              />
            </section>

            <Separator />

            <TaskExtrasPanel key={task.id} taskId={task.id} />
          </div>

          <aside className="space-y-6 border-t bg-muted/20 p-6 md:border-l md:border-t-0">
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Планирование
              </h3>
              <div className="space-y-3">
                <TaskSchedulePicker
                  startDate={task.startDate}
                  startTime={task.startTime}
                  endDate={task.dueDate}
                  endTime={task.dueTime}
                  onChange={(patch) => onUpdate(task.id, patch)}
                />

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw className="size-3.5" />
                    Оценка, минут
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={estimate}
                    onChange={(event) => setEstimate(event.target.value)}
                    onBlur={saveEstimate}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    placeholder="Без оценки"
                    className="bg-background"
                  />
                </label>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <Button
                className={cn(
                  "w-full justify-start rounded-xl",
                  task.checked &&
                    "bg-emerald-600 text-white hover:bg-emerald-600/90",
                )}
                onClick={() => onToggle(task.id, !task.checked)}
                disabled={pending}
              >
                <CheckCircle2 className="size-4" />
                {task.checked ? "Снять выполнение" : "Выполнить задачу"}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl"
                onClick={() => onDuplicate(task.id)}
                disabled={pending}
              >
                <Copy className="size-4" />
                Дублировать
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onTrash(task.id);
                }}
                disabled={pending}
              >
                <Trash2 className="size-4" />
                В корзину
              </Button>
            </section>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
