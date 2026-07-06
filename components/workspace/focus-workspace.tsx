"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUp,
  BriefcaseBusiness,
  Gauge,
  Mic,
  MoreHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createTask,
  deleteTask,
  duplicateTaskAction,
  setTaskDone,
  updateTask,
} from "@/app/(workspace)/today/actions";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WeeklyPlanner } from "@/components/workspace/weekly-planner";
import { dateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  FocusTask,
  FocusTaskPatch,
  TaskFormOptions,
} from "@/lib/data/tasks";

type WorkspaceLevel = "desk" | "focus" | "plan";

type TaskHandlers = {
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
};

const levels: Array<{ id: WorkspaceLevel; label: string }> = [
  { id: "desk", label: "Деск" },
  { id: "focus", label: "Фокус" },
  { id: "plan", label: "План" },
];

function WorkspaceChrome({
  activeLevel,
  onLevelChange,
}: {
  activeLevel: WorkspaceLevel;
  onLevelChange: (level: WorkspaceLevel) => void;
}) {
  const currentDate = new Date();
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(currentDate)
    .replace(" г.", "");
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(currentDate);
  const dateLabel = `${datePart}, ${weekday}`;

  return (
    <>
      <nav
        className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 rounded-full bg-muted p-1 shadow-inner sm:top-5"
        aria-label="Уровень рабочего пространства"
      >
        {levels.map((level) => (
          <Button
            key={level.id}
            variant="ghost"
            size="sm"
            onClick={() => onLevelChange(level.id)}
            className={cn(
              "relative h-9 min-w-20 rounded-full px-4 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground sm:h-10 sm:min-w-24 sm:px-5",
              activeLevel === level.id && "text-foreground",
            )}
          >
            {activeLevel === level.id ? (
              <motion.span
                layoutId="active-workspace-level"
                className="absolute inset-0 -z-10 rounded-full border bg-background shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            {level.label}
          </Button>
        ))}
      </nav>

      <p className="pointer-events-none fixed left-1/2 top-[145px] z-40 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground sm:top-[84px]">
        {dateLabel}
      </p>
    </>
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onOpen,
}: { task: FocusTask } & TaskHandlers) {
  return (
    <Card
      className="relative rounded-[20px] bg-card py-0 ring-1 ring-border shadow-[0_16px_36px_-24px_rgb(0_0_0/0.32)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Button
        variant="ghost"
        className="absolute inset-0 z-0 h-full w-full rounded-[20px] p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(task.id)}
        aria-label={`Открыть задачу: ${task.title}`}
      />
      <CardContent className="pointer-events-none relative z-10 p-[14px]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            <Sparkles className="size-3" />
            {task.meta}
          </span>
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
        </div>

        <div className="flex items-start gap-2.5">
          <div className="pointer-events-auto">
            <Checkbox
              checked={task.checked}
              onCheckedChange={(value) => onToggle(task.id, value === true)}
              className="mt-1 size-4 rounded-full"
              aria-label={`Завершить: ${task.title}`}
            />
          </div>
          <p
            className={cn(
              "min-w-0 flex-1 text-lg font-semibold leading-6 tracking-[-0.025em]",
              task.checked ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {task.title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FocusLevel({
  tasks,
  onToggle,
  onDelete,
  onOpen,
}: { tasks: FocusTask[] } & TaskHandlers) {
  return (
    <section className="mx-auto w-full max-w-[440px] pb-40 pt-[188px] sm:pt-[124px]">
      <div className="space-y-4">
        <div>
          <p className="mb-2 px-2 text-xs text-muted-foreground">Сегодня</p>
          {tasks.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-border/70 bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Пока нет задач. Добавьте первую через поле снизу.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DeskLevel({ tasks }: { tasks: FocusTask[] }) {
  const openTasks = tasks.filter((task) => task.status === "open");
  const nextTask = openTasks[0];
  const countLabel = pluralizeTasks(openTasks.length);

  return (
    <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 pb-40 pt-40 sm:grid-cols-2 sm:pt-28">
      <Card className="min-h-52 bg-card/90">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <Gauge className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ритм дня</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.05em]">{countLabel}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="min-h-52 bg-card/90">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <BriefcaseBusiness className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ближайший блок</p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">
              {nextTask ? nextTask.title : "Нет активных задач"}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function pluralizeTasks(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "задач";
  if (mod10 === 1 && mod100 !== 11) {
    word = "задача";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "задачи";
  }
  return `${count} ${word}`;
}

function AiDock({ onCreate, pending }: { onCreate: (title: string) => void; pending: boolean }) {
  const [draft, setDraft] = useState("");

  function submit() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    onCreate(title);
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(372px,calc(100vw-32px))] -translate-x-1/2">
      <Card className="rounded-[20px] bg-background/98 py-0 ring-1 ring-border shadow-[0_22px_64px_-24px_rgb(0_0_0/0.32)] backdrop-blur-2xl">
        <CardContent className="flex items-center gap-1 p-1">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            className="h-10 border-0 bg-transparent px-3 text-[15px] shadow-none focus-visible:ring-0"
            placeholder="Спросите или поставьте задачу"
            aria-label="Новая задача"
          />
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Голосовой ввод">
            <Mic className="size-[18px]" />
          </Button>
          <Button
            size="icon"
            className="rounded-full"
            aria-label="Добавить задачу"
            onClick={submit}
            disabled={pending || draft.trim().length === 0}
          >
            <ArrowUp className="size-[18px]" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function FocusWorkspace({
  tasks,
  taskOptions,
}: {
  tasks: FocusTask[];
  taskOptions: TaskFormOptions;
}) {
  const [activeLevel, setActiveLevel] = useState<WorkspaceLevel>("focus");
  const [direction, setDirection] = useState(0);
  const [items, setItems] = useState<FocusTask[]>(tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const selectedTask =
    items.find((task) => task.id === selectedTaskId) ?? null;

  // Keep local state in sync with fresh server data after revalidation.
  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  function selectLevel(nextLevel: WorkspaceLevel) {
    if (nextLevel === activeLevel) return;

    const currentIndex = levels.findIndex((level) => level.id === activeLevel);
    const nextIndex = levels.findIndex((level) => level.id === nextLevel);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveLevel(nextLevel);
  }

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
        const confirmedPatch: FocusTaskPatch = {};
        for (const key of Object.keys(patch) as Array<keyof FocusTaskPatch>) {
          Object.assign(confirmedPatch, { [key]: updatedTask[key] });
        }
        const refreshMeta =
          "dueDate" in patch || "priority" in patch
            ? { meta: updatedTask.meta }
            : {};
        setItems((current) =>
          current.map((task) =>
            task.id === id
              ? { ...task, ...confirmedPatch, ...refreshMeta }
              : task,
          ),
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

  function handleCreate(title: string) {
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticTask: FocusTask = {
      checked: false,
      description: null,
      dueDate: dateKey(),
      dueTime: null,
      estimateMinutes: null,
      id: optimisticId,
      meta: "Сегодня · без приоритета",
      priority: "none",
      projectId: null,
      spaceId: taskOptions.statuses[0]?.spaceId ?? "optimistic-space",
      startDate: dateKey(),
      startTime: null,
      status: "open",
      statusId: null,
      title,
      type: "task",
    };
    setItems((current) => [optimisticTask, ...current]);

    startTransition(async () => {
      const result = await createTask(title);
      if (result.error) {
        toast.error(result.error);
        setItems((current) => current.filter((task) => task.id !== optimisticId));
      } else if (result.task) {
        const createdTask = result.task;
        setItems((current) =>
          current.map((task) => (task.id === optimisticId ? createdTask : task)),
        );
      }
    });
  }

  return (
    <>
      <div className="workspace-progressive-blur workspace-progressive-blur--top" aria-hidden="true" />
      <div className="workspace-progressive-blur workspace-progressive-blur--bottom" aria-hidden="true" />
      <WorkspaceChrome activeLevel={activeLevel} onLevelChange={selectLevel} />

      <div className="grid min-h-screen min-w-0">
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            <motion.div
              key={activeLevel}
              custom={direction}
              className="col-start-1 row-start-1 min-h-screen min-w-0 origin-center"
              variants={{
                initial: (value: number) => ({
                  opacity: 0,
                  scale: reduceMotion ? 1 : value > 0 ? 0.82 : 1.18,
                  filter: reduceMotion ? "blur(0px)" : "blur(16px)",
                }),
                animate: {
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                },
                exit: (value: number) => ({
                  opacity: 0,
                  scale: reduceMotion ? 1 : value > 0 ? 1.18 : 0.82,
                  filter: reduceMotion ? "blur(0px)" : "blur(16px)",
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: reduceMotion ? 0.01 : 0.56, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeLevel === "desk" ? <DeskLevel tasks={items} /> : null}
              {activeLevel === "focus" ? (
                <FocusLevel
                  tasks={items}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onOpen={setSelectedTaskId}
                />
              ) : null}
              {activeLevel === "plan" ? <WeeklyPlanner tasks={items} /> : null}
            </motion.div>
          </AnimatePresence>
      </div>

      <AiDock onCreate={handleCreate} pending={pending} />
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
    </>
  );
}
