"use client";

// Панель предложений ИИ: карточки-кандидаты, которые пользователь правит и
// подтверждает. Ничего не создаёт сама — только отдаёт выбранное наверх через
// onCreate. Источник предложений разбору неизвестен (поле ввода, голос, Telegram).

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedTask } from "@/lib/ai/parse-inbox";
import type { TaskProjectOption } from "@/lib/data/tasks";
import { cn } from "@/lib/utils";

const LOW_CONFIDENCE = 0.6;

const typeLabels: Record<ParsedTask["type"], string> = {
  call: "Созвон",
  meeting: "Встреча",
  task: "Задача",
};

const priorityLabels: Record<ParsedTask["priority"], string> = {
  high: "Высокий",
  low: "Низкий",
  medium: "Средний",
  none: "Без приоритета",
};

const priorityClass: Record<ParsedTask["priority"], string> = {
  high: "text-red-500",
  low: "text-sky-600",
  medium: "text-amber-600",
  none: "",
};

type SuggestionRow = ParsedTask & { included: boolean; key: string };

function seedRows(suggestions: ParsedTask[]): SuggestionRow[] {
  return suggestions.map((task, index) => ({
    ...task,
    included: true,
    key: `${index}-${task.title}`,
  }));
}

function formatDue(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  const label = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return dueTime ? `${label}, ${dueTime}` : label;
}

/** Пустая рамка на время разбора: скелетон-карточки, не спиннер. */
export function TaskSuggestionsSkeleton() {
  return (
    <Card className="rounded-[20px] bg-background/98 py-0 ring-1 ring-border shadow-[0_22px_64px_-24px_rgb(0_0_0/0.32)] backdrop-blur-2xl">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          <Sparkles className="size-3" />
          Разбираю…
        </div>
        {[0, 1].map((index) => (
          <div key={index} className="space-y-2 rounded-2xl border border-border/70 p-3">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-4xl" />
              <Skeleton className="h-5 w-20 rounded-4xl" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TaskSuggestions({
  onCancel,
  onCreate,
  pending,
  projects,
  suggestions,
}: {
  onCancel: () => void;
  onCreate: (tasks: ParsedTask[]) => void;
  pending: boolean;
  projects: TaskProjectOption[];
  suggestions: ParsedTask[];
}) {
  const [rows, setRows] = useState<SuggestionRow[]>(() => seedRows(suggestions));

  // Свежий разбор → пересобираем карточки, отбрасывая прошлые правки.
  useEffect(() => {
    setRows(seedRows(suggestions));
  }, [suggestions]);

  const includedCount = rows.filter((row) => row.included).length;

  function patchRow(key: string, patch: Partial<SuggestionRow>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function submit() {
    const chosen = rows
      .filter((row) => row.included)
      .map(
        (row): ParsedTask => ({
          confidence: row.confidence,
          due_date: row.due_date,
          due_time: row.due_time,
          priority: row.priority,
          project_id: row.project_id,
          title: row.title,
          type: row.type,
        }),
      );
    if (chosen.length > 0) {
      onCreate(chosen);
    }
  }

  return (
    <Card className="rounded-[20px] bg-background/98 py-0 ring-1 ring-border shadow-[0_22px_64px_-24px_rgb(0_0_0/0.32)] backdrop-blur-2xl">
      <CardContent className="flex max-h-[min(60vh,460px)] flex-col gap-3 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          <Sparkles className="size-3" />
          Предложения ИИ
        </div>

        <div className="-mx-1 space-y-2 overflow-y-auto px-1">
          {rows.map((row) => {
            const projectName = row.project_id
              ? projects.find((project) => project.id === row.project_id)?.name ??
                null
              : null;
            const due = formatDue(row.due_date, row.due_time);
            const unsure = row.confidence < LOW_CONFIDENCE;

            return (
              <div
                key={row.key}
                className={cn(
                  "rounded-2xl border border-border/70 p-3 transition-opacity",
                  unsure && "opacity-60",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    checked={row.included}
                    onCheckedChange={(value) =>
                      patchRow(row.key, { included: value === true })
                    }
                    className="mt-1 size-4 rounded-[6px]"
                    aria-label={`Включить: ${row.title}`}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={row.title}
                      onChange={(event) =>
                        patchRow(row.key, { title: event.target.value })
                      }
                      className="h-8 border-0 bg-transparent px-0 text-[15px] font-medium shadow-none focus-visible:ring-0"
                      aria-label="Название задачи"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{typeLabels[row.type]}</Badge>
                      {row.priority !== "none" ? (
                        <Badge
                          variant="outline"
                          className={priorityClass[row.priority]}
                        >
                          {priorityLabels[row.priority]}
                        </Badge>
                      ) : null}
                      {due ? <Badge variant="outline">{due}</Badge> : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-5 items-center rounded-4xl border border-border bg-input/30 px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            {projectName ?? "Без проекта"}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Проект</DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={() => patchRow(row.key, { project_id: null })}
                          >
                            Без проекта
                          </DropdownMenuItem>
                          {projects.map((project) => (
                            <DropdownMenuItem
                              key={project.id}
                              onSelect={() =>
                                patchRow(row.key, { project_id: project.id })
                              }
                            >
                              {project.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {unsure ? (
                        <span className="text-xs text-muted-foreground">
                          не уверен
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={submit}
            disabled={pending || includedCount === 0}
          >
            Создать выбранные ({includedCount})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
