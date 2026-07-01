"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  GripVertical,
  MoveHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FocusTask } from "@/lib/data/tasks";
import { cn } from "@/lib/utils";

type PlannedTask = {
  id: string;
  title: string;
  week: number;
  startDay: number;
  span: number;
  tone: "rose" | "blue" | "sand" | "mint";
};

type PointerAction = {
  mode: "move" | "resize";
  taskId: string;
  pointerStart: number;
  originalStart: number;
  originalSpan: number;
};

const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const shortDayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const taskTones: PlannedTask["tone"][] = ["rose", "blue", "sand", "mint"];
const plannerStorageKey = "focus-weekly-planner-v1";

const toneClasses: Record<PlannedTask["tone"], string> = {
  rose: "border-border bg-chart-1/40 text-foreground",
  blue: "border-border bg-chart-2/10 text-foreground",
  sand: "border-border bg-chart-3/10 text-foreground",
  mint: "border-border bg-chart-4/10 text-foreground",
};

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getMonthName(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
    .formatToParts(date)
    .find((part) => part.type === "month")?.value;
}

function formatWeekRange(week: Date) {
  const end = addDays(week, 6);
  const startMonth = getMonthName(week);
  const endMonth = getMonthName(end);

  if (week.getFullYear() !== end.getFullYear()) {
    return `${week.getDate()} ${startMonth} ${week.getFullYear()} — ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  if (week.getMonth() !== end.getMonth()) {
    return `${week.getDate()} ${startMonth} — ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  return `${week.getDate()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

function makeInitialTasks(tasks: FocusTask[], week: number): PlannedTask[] {
  const starts = [0, 2, 4, 1];
  const spans = [2, 1, 2, 1];

  return tasks.slice(0, 4).map((task, index) => ({
    id: task.id,
    title: task.title,
    week,
    startDay: starts[index] ?? index % 5,
    span: spans[index] ?? 1,
    tone: taskTones[index % taskTones.length],
  }));
}

function formatTaskCount(count: number) {
  const ending = count % 10;
  const endingPair = count % 100;

  if (ending === 1 && endingPair !== 11) return `${count} задача`;
  if (ending >= 2 && ending <= 4 && (endingPair < 12 || endingPair > 14)) return `${count} задачи`;
  return `${count} задач`;
}

export function WeeklyPlanner({ tasks }: { tasks: FocusTask[] }) {
  const today = useMemo(() => new Date(), []);
  const todayWeek = useMemo(() => startOfWeek(today).getTime(), [today]);
  const [activeWeek, setActiveWeek] = useState(todayWeek);
  const [direction, setDirection] = useState(1);
  const [showWeekends, setShowWeekends] = useState(true);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>(() => makeInitialTasks(tasks, todayWeek));
  const [hasLoadedPlan, setHasLoadedPlan] = useState(false);
  const [activeAction, setActiveAction] = useState<PointerAction | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const activeActionRef = useRef<PointerAction | null>(null);
  const activeWeekRef = useRef(activeWeek);
  const visibleDayCountRef = useRef(showWeekends ? 7 : 5);
  const reduceMotion = useReducedMotion();
  const visibleDayCount = showWeekends ? 7 : 5;
  const weekDate = useMemo(() => new Date(activeWeek), [activeWeek]);
  const visibleTasks = plannedTasks.filter((task) => task.week === activeWeek);

  activeWeekRef.current = activeWeek;
  visibleDayCountRef.current = visibleDayCount;

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(plannerStorageKey);
      const storedTasks: unknown = storedValue ? JSON.parse(storedValue) : null;

      if (Array.isArray(storedTasks)) {
        setPlannedTasks((current) =>
          current.map((task) => {
            const storedTask = storedTasks.find(
              (candidate) =>
                candidate &&
                typeof candidate === "object" &&
                "id" in candidate &&
                candidate.id === task.id,
            ) as Partial<PlannedTask> | undefined;

            if (
              !storedTask ||
              typeof storedTask.week !== "number" ||
              typeof storedTask.startDay !== "number" ||
              typeof storedTask.span !== "number"
            ) {
              return task;
            }

            return {
              ...task,
              week: storedTask.week,
              startDay: clamp(storedTask.startDay, 0, 6),
              span: clamp(storedTask.span, 1, 7),
            };
          }),
        );
      }
    } catch {
      window.localStorage.removeItem(plannerStorageKey);
    } finally {
      setHasLoadedPlan(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPlan) return;
    window.localStorage.setItem(plannerStorageKey, JSON.stringify(plannedTasks));
  }, [hasLoadedPlan, plannedTasks]);

  useEffect(() => {
    function updateTask(event: PointerEvent) {
      const action = activeActionRef.current;
      const grid = gridRef.current;
      if (!action || !grid) return;

      const dayCount = visibleDayCountRef.current;
      const columnWidth = grid.getBoundingClientRect().width / dayCount;
      const dayDelta = Math.round((event.clientX - action.pointerStart) / columnWidth);

      setPlannedTasks((current) =>
        current.map((task) => {
          if (task.id !== action.taskId || task.week !== activeWeekRef.current) return task;

          if (action.mode === "move") {
            return {
              ...task,
              startDay: clamp(
                action.originalStart + dayDelta,
                0,
                dayCount - action.originalSpan,
              ),
            };
          }

          return {
            ...task,
            span: clamp(
              action.originalSpan + dayDelta,
              1,
              dayCount - action.originalStart,
            ),
          };
        }),
      );
    }

    function finishAction() {
      activeActionRef.current = null;
      setActiveAction(null);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    }

    window.addEventListener("pointermove", updateTask);
    window.addEventListener("pointerup", finishAction);
    window.addEventListener("pointercancel", finishAction);

    return () => {
      activeActionRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.removeEventListener("pointermove", updateTask);
      window.removeEventListener("pointerup", finishAction);
      window.removeEventListener("pointercancel", finishAction);
    };
  }, []);

  function changeWeek(offset: number) {
    setDirection(offset);
    setActiveWeek((current) => addDays(new Date(current), offset * 7).getTime());
  }

  function returnToToday() {
    setDirection(activeWeek > todayWeek ? -1 : 1);
    setActiveWeek(todayWeek);
  }

  function toggleWeekends() {
    const nextValue = !showWeekends;
    setShowWeekends(nextValue);

    if (!nextValue) {
      setPlannedTasks((current) =>
        current.map((task) =>
          task.week === activeWeek
            ? {
                ...task,
                startDay: Math.min(task.startDay, 4),
                span: Math.min(task.span, 5 - Math.min(task.startDay, 4)),
              }
            : task,
        ),
      );
    }
  }

  function beginAction(
    event: React.PointerEvent,
    task: PlannedTask,
    mode: PointerAction["mode"],
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const action = {
      mode,
      taskId: task.id,
      pointerStart: event.clientX,
      originalStart: task.startDay,
      originalSpan: task.span,
    };
    activeActionRef.current = action;
    setActiveAction(action);
    document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";
    document.body.style.userSelect = "none";
  }

  function moveWithKeyboard(task: PlannedTask, mode: PointerAction["mode"], delta: number) {
    setPlannedTasks((current) =>
      current.map((item) => {
        if (item.id !== task.id || item.week !== activeWeek) return item;

        if (mode === "move") {
          return {
            ...item,
            startDay: clamp(item.startDay + delta, 0, visibleDayCount - item.span),
          };
        }

        return {
          ...item,
          span: clamp(item.span + delta, 1, visibleDayCount - item.startDay),
        };
      }),
    );
  }

  function handleTaskKeyDown(
    event: React.KeyboardEvent,
    task: PlannedTask,
    mode: PointerAction["mode"],
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveWithKeyboard(task, mode, event.key === "ArrowRight" ? 1 : -1);
  }

  const isCurrentWeek = activeWeek === todayWeek;
  const todayDayIndex = (today.getDay() + 6) % 7;

  return (
    <section className="mx-auto min-w-0 w-full max-w-[1024px] pb-40 pt-[188px] sm:pt-[124px]">
      <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-border/80 bg-card/96 py-0 shadow-soft">
        <CardContent className="p-0">
          <header className="flex flex-col gap-4 border-b px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-muted">
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Неделя</p>
                <h2 className="truncate text-lg font-semibold tracking-[-0.03em] sm:text-xl">
                  {formatWeekRange(weekDate)}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full px-4"
                disabled={isCurrentWeek}
                onClick={returnToToday}
              >
                Сегодня
              </Button>
              <Button
                variant={showWeekends ? "outline" : "secondary"}
                size="sm"
                className="h-9 rounded-full px-3"
                onClick={toggleWeekends}
                aria-pressed={!showWeekends}
              >
                <EyeOff className="size-4" />
                <span className="hidden sm:inline">{showWeekends ? "Скрыть выходные" : "Показать выходные"}</span>
                <span className="sm:hidden">Выходные</span>
              </Button>
              <div className="flex items-center rounded-full border bg-background p-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => changeWeek(-1)}
                  aria-label="Предыдущая неделя"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => changeWeek(1)}
                  aria-label="Следующая неделя"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <motion.div
                  key={activeWeek}
                  custom={direction}
                  initial={{
                    x: reduceMotion ? 0 : direction * 64,
                    opacity: 0,
                    filter: reduceMotion ? "blur(0px)" : "blur(8px)",
                  }}
                  animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{
                    x: reduceMotion ? 0 : direction * -64,
                    opacity: 0,
                    filter: reduceMotion ? "blur(0px)" : "blur(8px)",
                  }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="grid border-b bg-muted/25"
                    style={{ gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: visibleDayCount }, (_, dayIndex) => {
                      const date = addDays(weekDate, dayIndex);
                      const isToday = isCurrentWeek && dayIndex === todayDayIndex;
                      const isWeekend = dayIndex > 4;

                      return (
                        <div
                          key={dayNames[dayIndex]}
                          className={cn(
                            "flex min-h-20 items-center justify-between border-r px-4 py-3 last:border-r-0",
                            isWeekend && "bg-muted/35",
                          )}
                        >
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              {shortDayNames[dayIndex]}
                            </p>
                            <p className="mt-1 text-sm font-medium">{dayNames[dayIndex]}</p>
                          </div>
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full text-base font-semibold tabular-nums",
                              isToday && "bg-foreground text-background",
                            )}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div ref={gridRef} className="relative min-h-[360px]">
                    <div
                      className="pointer-events-none absolute inset-0 grid"
                      style={{ gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))` }}
                      aria-hidden="true"
                    >
                      {Array.from({ length: visibleDayCount }, (_, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={cn(
                            "border-r last:border-r-0",
                            dayIndex > 4 && "bg-muted/20",
                            isCurrentWeek && dayIndex === todayDayIndex && "bg-foreground/[0.025]",
                          )}
                        />
                      ))}
                    </div>

                    <div className="relative space-y-2 p-3">
                      {visibleTasks.length ? (
                        visibleTasks.map((task) => {
                          const start = Math.min(task.startDay, visibleDayCount - 1);
                          const span = Math.min(task.span, visibleDayCount - start);

                          return (
                            <div
                              key={task.id}
                              className="grid h-[70px]"
                              style={{ gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))` }}
                            >
                              <article
                                data-planner-task={task.id}
                                className={cn(
                                  "group relative flex min-w-0 touch-none items-center rounded-[16px] border shadow-sm transition-shadow hover:shadow-md",
                                  toneClasses[task.tone],
                                  activeAction?.taskId === task.id && "z-10 shadow-lg ring-2 ring-foreground/15",
                                )}
                                style={{ gridColumn: `${start + 1} / span ${span}` }}
                              >
                                <button
                                  type="button"
                                  className="flex h-full min-w-0 flex-1 cursor-grab touch-none items-center gap-2 px-3 text-left active:cursor-grabbing"
                                  onPointerDown={(event) => beginAction(event, task, "move")}
                                  onKeyDown={(event) => handleTaskKeyDown(event, task, "move")}
                                  aria-label={`Переместить задачу «${task.title}»`}
                                >
                                  <GripVertical className="size-4 shrink-0 opacity-45 transition-opacity group-hover:opacity-80" />
                                  <span className="min-w-0">
                                    <span className="block truncate text-[13px] font-semibold leading-5">
                                      {task.title}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] opacity-65">
                                      {span === 1 ? dayNames[start] : `${span} дня`}
                                    </span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="flex h-full w-7 shrink-0 cursor-ew-resize touch-none items-center justify-center rounded-r-[16px] border-l border-current/10 bg-background/20 opacity-55 transition-opacity hover:opacity-100"
                                  onPointerDown={(event) => beginAction(event, task, "resize")}
                                  onKeyDown={(event) => handleTaskKeyDown(event, task, "resize")}
                                  aria-label={`Изменить длительность задачи «${task.title}»`}
                                  title="Потяните, чтобы изменить длительность"
                                >
                                  <MoveHorizontal className="size-3.5" />
                                </button>
                              </article>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
                          <Badge variant="outline" className="mb-3 rounded-full px-3 py-1 font-normal">
                            Свободная неделя
                          </Badge>
                          <p className="max-w-xs text-sm text-muted-foreground">
                            На этой неделе пока нет задач. Вернитесь на сегодня или добавьте задачу через ИИ-строку.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-4 border-t bg-muted/20 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Перетаскивайте задачи между днями. Тяните правый край, чтобы растянуть задачу.
            </p>
            <Badge variant="secondary" className="shrink-0 rounded-full font-normal">
              {formatTaskCount(visibleTasks.length)}
            </Badge>
          </footer>
        </CardContent>
      </Card>
    </section>
  );
}
