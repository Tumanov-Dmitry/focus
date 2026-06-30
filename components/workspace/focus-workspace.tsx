"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUp,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  FileText,
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
  WalletCards,
} from "lucide-react";
import { type CSSProperties, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FocusTask } from "@/lib/data/tasks";

type WorkspaceLevel = "desk" | "focus" | "plan";

const levels: Array<{ id: WorkspaceLevel; label: string }> = [
  { id: "desk", label: "Деск" },
  { id: "focus", label: "Фокус" },
  { id: "plan", label: "План" },
];

const railItems = [
  { label: "Финансы", icon: WalletCards, group: "personal", rotation: -4.5, offset: 10 },
  { label: "Документы", icon: FileText, group: "personal", rotation: 3, offset: 2 },
  { label: "Фокус", icon: Target, group: "work", rotation: -2.5, offset: 8 },
  { label: "Задачи", icon: CalendarDays, group: "work", rotation: 4, offset: 0 },
  { label: "Проекты", icon: FolderKanban, group: "work", rotation: -4, offset: 12 },
  { label: "Клиенты", icon: UsersRound, group: "work", rotation: 2.5, offset: 4 },
  { label: "Аналитика", icon: BarChart3, group: "work", rotation: -3, offset: 9 },
  { label: "Заметки", icon: NotebookPen, group: "work", rotation: 3.5, offset: 1 },
];

function LeftRail() {
  return (
    <aside
      className="workspace-rail fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 py-8 lg:block"
      aria-label="Разделы рабочего пространства"
    >
      <div className="flex w-36 flex-col items-start gap-2">
        {railItems.map((item, index) => {
          const Icon = item.icon;
          const previousGroup = index > 0 ? railItems[index - 1].group : null;

          return (
            <Button
              key={item.label}
              variant={item.label === "Фокус" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "workspace-rail-item h-8 justify-start gap-2 rounded-md border border-transparent bg-background/78 px-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur-md transition-[transform,color,background-color,border-color] duration-500 ease-out hover:border-border hover:bg-background hover:text-foreground",
                item.label === "Фокус" && "border-border bg-background text-foreground",
                previousGroup && previousGroup !== item.group && "mt-4",
              )}
              style={
                {
                  "--rail-x": `${item.offset}px`,
                  "--rail-r": `${item.rotation}deg`,
                } as CSSProperties
              }
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
  return (
    <>
      <div className="fixed left-5 top-5 z-40 flex items-center rounded-full border bg-background/92 p-1 shadow-sm backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Профиль">
          <CircleUserRound className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Открыть меню">
          <Menu className="size-4" />
        </Button>
      </div>

      <div className="fixed right-5 top-5 z-40 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-9 w-32 justify-start rounded-full bg-background/92 text-muted-foreground shadow-sm backdrop-blur-xl sm:flex"
        >
          <Search className="size-4" />
          Поиск
        </Button>
        <Button variant="outline" size="icon" className="rounded-full bg-background/92 shadow-sm backdrop-blur-xl" aria-label="Уведомления">
          <Bell className="size-4" />
        </Button>
      </div>

      <nav
        className="fixed left-1/2 top-5 z-40 flex -translate-x-1/2 rounded-full bg-muted/78 p-1 shadow-inner backdrop-blur-xl"
        aria-label="Уровень рабочего пространства"
      >
        {levels.map((level) => (
          <Button
            key={level.id}
            variant="ghost"
            size="sm"
            onClick={() => onLevelChange(level.id)}
            className={cn(
              "relative h-8 min-w-16 rounded-full px-4 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground",
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
    </>
  );
}

function TaskCard({ task, index }: { task: FocusTask; index: number }) {
  return (
    <Card className="border-border/80 bg-card/96 py-0 shadow-[0_14px_38px_-28px_oklch(0_0_0/0.62)]">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.04em] text-rose-500">
            <Sparkles className="size-3" />
            {index === 0 ? "ЭТЕШЕН · Прототип" : "ЭТЕШЕН"}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label="Действия задачи">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox defaultChecked={task.checked} className="mt-1 size-4 rounded-full" aria-label={`Завершить: ${task.title}`} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-5 tracking-[-0.02em]">
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
    <section className="mx-auto w-full max-w-[440px] pb-40 pt-20">
      <header className="mb-7 text-center">
        <p className="text-xs text-muted-foreground">30 июня 2026, вторник</p>
      </header>

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
    <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 pb-40 pt-28 sm:grid-cols-2">
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

function PlanLevel() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];

  return (
    <section className="mx-auto w-full max-w-5xl pb-40 pt-28">
      <Card className="overflow-x-auto bg-card/92 py-0">
        <CardContent className="grid min-h-96 min-w-[720px] grid-cols-5 divide-x p-0">
          {days.map((day, index) => (
            <div key={day} className="p-4">
              <p className="text-xs text-muted-foreground">{day}</p>
              <p className="mt-1 text-lg font-semibold">{29 + index}</p>
              {index === 1 || index === 3 ? (
                <div className="mt-8 rounded-lg border bg-muted/60 p-3 text-xs leading-5">
                  {index === 1 ? "Прототип первого экрана" : "Разбор задач недели"}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function AiDock() {
  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(460px,calc(100vw-32px))] -translate-x-1/2">
      <Card className="border-border/80 bg-background/96 py-0 shadow-[0_22px_64px_-24px_oklch(0_0_0/0.48)] backdrop-blur-2xl">
        <CardContent className="flex items-center gap-1.5 p-2">
          <Bot className="ml-2 size-4 text-muted-foreground" />
          <Input
            className="h-10 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
            placeholder="Спросите или поставьте задачу"
          />
          <Button variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground" aria-label="Голосовой ввод">
            <Mic className="size-4" />
          </Button>
          <Button size="icon-sm" className="rounded-full" aria-label="Отправить">
            <ArrowUp className="size-4" />
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
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.965_0_0)] text-foreground">
      <WorkspaceChrome activeLevel={activeLevel} onLevelChange={selectLevel} />
      <LeftRail />

      <div className="workspace-progressive-blur workspace-progressive-blur--top" aria-hidden="true" />
      <div className="workspace-progressive-blur workspace-progressive-blur--bottom" aria-hidden="true" />

      <main className="min-h-screen px-4 sm:px-8 lg:pl-48">
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={activeLevel}
            custom={direction}
            variants={{
              initial: (value: number) => ({
                opacity: 0,
                y: reduceMotion ? 0 : value * 64,
                scale: reduceMotion ? 1 : 0.985,
                filter: reduceMotion ? "blur(0px)" : "blur(18px)",
              }),
              animate: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              },
              exit: (value: number) => ({
                opacity: 0,
                y: reduceMotion ? 0 : value * -64,
                scale: reduceMotion ? 1 : 0.985,
                filter: reduceMotion ? "blur(0px)" : "blur(18px)",
              }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.01 : 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeLevel === "desk" ? <DeskLevel /> : null}
            {activeLevel === "focus" ? <FocusLevel tasks={tasks} /> : null}
            {activeLevel === "plan" ? <PlanLevel /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <AiDock />
    </div>
  );
}
