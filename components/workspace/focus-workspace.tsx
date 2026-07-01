"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUp,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  FolderKanban,
  Gauge,
  Menu,
  Mic,
  MoreHorizontal,
  NotebookPen,
  Search,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { WeeklyPlanner } from "@/components/workspace/weekly-planner";
import { cn } from "@/lib/utils";
import type { FocusTask } from "@/lib/data/tasks";

type WorkspaceLevel = "desk" | "focus" | "plan";

const levels: Array<{ id: WorkspaceLevel; label: string }> = [
  { id: "desk", label: "Деск" },
  { id: "focus", label: "Фокус" },
  { id: "plan", label: "План" },
];

const railItems = [
  { label: "Фокус", icon: Target },
  { label: "Задачи", icon: CalendarDays },
  { label: "Проекты", icon: FolderKanban },
  { label: "Клиенты", icon: UsersRound },
  { label: "Аналитика", icon: BarChart3 },
  { label: "Заметки", icon: NotebookPen },
];

function LeftRail() {
  return (
    <aside
      className="workspace-rail fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 py-8 lg:block"
      aria-label="Разделы рабочего пространства"
    >
      <div className="workspace-rail-stack flex w-36 flex-col items-start gap-2">
        {railItems.map((item) => {
          const Icon = item.icon;

          return (
            <Button
              key={item.label}
              variant={item.label === "Фокус" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 w-24 justify-start gap-2 rounded-lg border border-transparent bg-background/82 px-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur-md transition-colors duration-300 hover:border-border hover:bg-background hover:text-foreground",
                item.label === "Фокус" && "border-border bg-background text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}

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
      <div className="fixed left-5 top-5 z-40 flex items-center rounded-full border bg-background/92 p-1 shadow-sm backdrop-blur-xl">
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Профиль">
          <CircleUserRound className="size-5" />
        </Button>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Открыть меню">
          <Menu className="size-5" />
        </Button>
      </div>

      <div className="fixed right-5 top-5 z-40 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-12 w-36 justify-start rounded-full bg-background/92 px-4 text-sm text-muted-foreground shadow-sm backdrop-blur-xl sm:flex"
        >
          <Search className="size-5" />
          Поиск
        </Button>
        <Button variant="outline" size="icon-lg" className="size-12 rounded-full bg-background/92 shadow-sm backdrop-blur-xl" aria-label="Уведомления">
          <Bell className="size-5" />
        </Button>
      </div>

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

function TaskCard({ task, index }: { task: FocusTask; index: number }) {
  return (
    <Card className="rounded-[20px] bg-card py-0 ring-1 ring-border shadow-[0_16px_36px_-24px_rgb(0_0_0/0.32)]">
      <CardContent className="p-[14px]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-destructive/70">
            <Sparkles className="size-3" />
            {index === 0 ? "ЭТЕШЕН · Прототип" : "ЭТЕШЕН"}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label="Действия задачи">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox defaultChecked={task.checked} className="mt-1 size-4 rounded-full" aria-label={`Завершить: ${task.title}`} />
          <p className="min-w-0 flex-1 text-lg font-semibold leading-6 tracking-[-0.025em] text-foreground">
            {task.title}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6">
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px] font-normal text-muted-foreground">
            30 июня
          </Badge>
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px] font-normal text-muted-foreground">
            {index === 0 ? "Сейчас" : "Срочно"}
          </Badge>
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px] font-normal text-muted-foreground">
            1 / 2
          </Badge>
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px] font-normal text-muted-foreground">
            0
          </Badge>
          <Badge variant="outline" className="ml-auto h-6 rounded-md px-2 text-[10px] font-normal tabular-nums text-muted-foreground">
            00:00
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function FocusLevel({ tasks }: { tasks: FocusTask[] }) {
  const visibleTasks = tasks.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-[440px] pb-40 pt-[188px] sm:pt-[124px]">
      <div className="space-y-4">
        <div>
          <p className="mb-2 px-2 text-xs text-muted-foreground">Сегодня</p>
          <div className="space-y-2.5">
            {visibleTasks.slice(0, 2).map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
          </div>
        </div>

        {visibleTasks[2] ? (
          <div>
            <p className="mb-2 px-2 text-xs text-muted-foreground">Завтра</p>
            <TaskCard task={visibleTasks[2]} index={2} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DeskLevel() {
  return (
    <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 pb-40 pt-40 sm:grid-cols-2 sm:pt-28">
      <Card className="min-h-52 bg-card/90">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <Gauge className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ритм дня</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.05em]">3 задачи</p>
          </div>
        </CardContent>
      </Card>
      <Card className="min-h-52 bg-card/90">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <BriefcaseBusiness className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ближайший блок</p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">Работа над прототипом</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AiDock() {
  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(372px,calc(100vw-32px))] -translate-x-1/2">
      <Card className="rounded-[20px] bg-background/98 py-0 ring-1 ring-border shadow-[0_22px_64px_-24px_rgb(0_0_0/0.32)] backdrop-blur-2xl">
        <CardContent className="flex items-center gap-1 p-1">
          <Input
            className="h-10 border-0 bg-transparent px-3 text-[15px] shadow-none focus-visible:ring-0"
            placeholder="Спросите или поставьте задачу"
          />
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Голосовой ввод">
            <Mic className="size-[18px]" />
          </Button>
          <Button size="icon" className="rounded-full" aria-label="Отправить">
            <ArrowUp className="size-[18px]" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function FocusWorkspace({ tasks }: { tasks: FocusTask[] }) {
  const [activeLevel, setActiveLevel] = useState<WorkspaceLevel>("focus");
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();

  function selectLevel(nextLevel: WorkspaceLevel) {
    if (nextLevel === activeLevel) return;

    const currentIndex = levels.findIndex((level) => level.id === activeLevel);
    const nextIndex = levels.findIndex((level) => level.id === nextLevel);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveLevel(nextLevel);
  }

  return (
    <div className="workspace-theme relative min-h-screen overflow-x-hidden text-foreground">
      <WorkspaceChrome activeLevel={activeLevel} onLevelChange={selectLevel} />
      <LeftRail />

      <div className="workspace-progressive-blur workspace-progressive-blur--top" aria-hidden="true" />
      <div className="workspace-progressive-blur workspace-progressive-blur--bottom" aria-hidden="true" />

      <main className="min-h-screen min-w-0 px-4 sm:px-8">
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
              {activeLevel === "desk" ? <DeskLevel /> : null}
              {activeLevel === "focus" ? <FocusLevel tasks={tasks} /> : null}
              {activeLevel === "plan" ? <WeeklyPlanner tasks={tasks} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AiDock />
    </div>
  );
}
