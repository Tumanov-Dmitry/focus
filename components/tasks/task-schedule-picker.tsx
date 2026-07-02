"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { dateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { FocusTaskPatch } from "@/lib/data/tasks";

type TaskSchedulePickerProps = {
  endDate: string | null;
  endTime: string | null;
  onChange: (patch: FocusTaskPatch) => void;
  startDate: string | null;
  startTime: string | null;
};

type CalendarDay = {
  date: Date;
  key: string;
  outside: boolean;
};

const weekdays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthIndex, 1 - mondayOffset + index);
    return {
      date,
      key: toDateKey(date),
      outside: date.getMonth() !== monthIndex,
    };
  });
}

function formatDate(value: string | null): string {
  if (!value) return "Не выбрано";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDateKey(value));
}

function formatMonth(month: Date): string {
  const value = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(month);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTriggerLabel(
  startDate: string | null,
  endDate: string | null,
  startTime: string | null,
  endTime: string | null,
): string {
  if (!startDate && !endDate) return "Запланировать";

  const format = (value: string) =>
    new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
    })
      .format(parseDateKey(value))
      .replace(".", "");

  let label =
    startDate && endDate && startDate !== endDate
      ? `${format(startDate)} — ${format(endDate)}`
      : format(startDate ?? endDate!);

  if (startTime || endTime) {
    const start = startTime?.slice(0, 5);
    const end = endTime?.slice(0, 5);
    label += ` · ${start && end ? `${start}–${end}` : start ?? end}`;
  }

  return label;
}

export function TaskSchedulePicker({
  endDate,
  endTime,
  onChange,
  startDate,
  startTime,
}: TaskSchedulePickerProps) {
  const initialDate = startDate ?? endDate ?? dateKey();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDateKey(initialDate));
  const [selectionPhase, setSelectionPhase] = useState<"start" | "end">(
    "start",
  );
  const [draftStartDate, setDraftStartDate] = useState<string | null>(
    startDate ?? endDate,
  );
  const [draftEndDate, setDraftEndDate] = useState<string | null>(
    endDate ?? startDate,
  );
  const [draftStartTime, setDraftStartTime] = useState<string | null>(
    startTime?.slice(0, 5) ?? null,
  );
  const [draftEndTime, setDraftEndTime] = useState<string | null>(
    endTime?.slice(0, 5) ?? null,
  );

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate ?? endDate;
    const nextEnd = endDate ?? startDate;
    setDraftStartDate(nextStart);
    setDraftEndDate(nextEnd);
    setDraftStartTime(startTime?.slice(0, 5) ?? null);
    setDraftEndTime(endTime?.slice(0, 5) ?? null);
    setMonth(parseDateKey(nextStart ?? nextEnd ?? dateKey()));
    setSelectionPhase("start");
  }, [endDate, endTime, open, startDate, startTime]);

  const days = buildMonthDays(month);
  const today = dateKey();
  const timeEnabled = draftStartTime !== null || draftEndTime !== null;
  const invalidTimeRange =
    draftStartDate !== null &&
    draftStartDate === draftEndDate &&
    draftStartTime !== null &&
    draftEndTime !== null &&
    draftStartTime > draftEndTime;
  const canApply =
    draftStartDate !== null &&
    draftEndDate !== null &&
    !invalidTimeRange;

  function selectDay(key: string) {
    if (selectionPhase === "start" || !draftStartDate) {
      setDraftStartDate(key);
      setDraftEndDate(null);
      setSelectionPhase("end");
      return;
    }

    if (key < draftStartDate) {
      setDraftEndDate(draftStartDate);
      setDraftStartDate(key);
    } else {
      setDraftEndDate(key);
    }
    setSelectionPhase("start");
  }

  function toggleTime(enabled: boolean) {
    if (!enabled) {
      setDraftStartTime(null);
      setDraftEndTime(null);
      return;
    }
    setDraftStartTime(startTime?.slice(0, 5) ?? "09:00");
    setDraftEndTime(endTime?.slice(0, 5) ?? "10:00");
  }

  function clearAll() {
    onChange({
      dueDate: null,
      dueTime: null,
      startDate: null,
      startTime: null,
    });
    setOpen(false);
  }

  function applySchedule() {
    if (!canApply) return;
    onChange({
      dueDate: draftEndDate,
      dueTime: timeEnabled ? draftEndTime : null,
      startDate: draftStartDate,
      startTime: timeEnabled ? draftStartTime : null,
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-11 w-full justify-start rounded-xl bg-background px-3 font-normal"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="truncate">
            {formatTriggerLabel(startDate, endDate, startTime, endTime)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(390px,calc(100vw-32px))] gap-0 overflow-hidden rounded-[24px] p-0"
      >
        <div className="space-y-2 p-4">
          <div className="grid grid-cols-[88px_1fr] items-center gap-3">
            <span className="text-sm text-muted-foreground">Начало</span>
            <div className="flex h-11 items-center rounded-xl bg-muted/70 pl-3">
              <span className="min-w-0 flex-1 text-base font-medium">
                {formatDate(draftStartDate)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="mr-1 rounded-full text-muted-foreground"
                disabled={!draftStartDate}
                onClick={() => {
                  setDraftStartDate(null);
                  setDraftEndDate(null);
                  setSelectionPhase("start");
                }}
                aria-label="Очистить дату начала"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-[88px_1fr] items-center gap-3">
            <span className="text-sm text-muted-foreground">Конец</span>
            <div className="flex h-11 items-center rounded-xl bg-muted/70 pl-3">
              <span className="min-w-0 flex-1 text-base font-medium">
                {formatDate(draftEndDate)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="mr-1 rounded-full text-muted-foreground"
                disabled={!draftEndDate}
                onClick={() => {
                  setDraftEndDate(null);
                  setSelectionPhase("end");
                }}
                aria-label="Очистить дату конца"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {timeEnabled ? (
            <div className="grid grid-cols-[88px_1fr_1fr] items-center gap-2 pt-1">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock3 className="size-3.5" />
                Время
              </span>
              <Input
                type="time"
                value={draftStartTime ?? ""}
                onChange={(event) =>
                  setDraftStartTime(event.target.value || null)
                }
                className="h-10 bg-muted/70"
                aria-label="Время начала"
              />
              <Input
                type="time"
                value={draftEndTime ?? ""}
                onChange={(event) =>
                  setDraftEndTime(event.target.value || null)
                }
                className="h-10 bg-muted/70"
                aria-label="Время окончания"
              />
            </div>
          ) : null}

          {invalidTimeRange ? (
            <p className="pl-[100px] text-xs text-destructive">
              Время окончания должно быть позже начала
            </p>
          ) : null}
        </div>

        <Separator />

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-semibold tracking-[-0.03em]">
              {formatMonth(month)}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() =>
                  setMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() - 1,
                        1,
                      ),
                  )
                }
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() =>
                  setMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + 1,
                        1,
                      ),
                  )
                }
                aria-label="Следующий месяц"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {weekdays.map((weekday) => (
              <span
                key={weekday}
                className="pb-2 text-center text-xs font-medium text-muted-foreground"
              >
                {weekday}
              </span>
            ))}
            {days.map((day) => {
              const isStart = day.key === draftStartDate;
              const isEnd = day.key === draftEndDate;
              const inRange =
                draftStartDate !== null &&
                draftEndDate !== null &&
                day.key > draftStartDate &&
                day.key < draftEndDate;

              return (
                <Button
                  key={day.key}
                  variant="ghost"
                  size="icon"
                  onClick={() => selectDay(day.key)}
                  className={cn(
                    "h-10 w-full rounded-xl text-[15px] font-medium",
                    day.outside && "text-muted-foreground/45",
                    inRange && "rounded-none bg-muted hover:bg-muted",
                    isStart &&
                      "rounded-r-none bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isEnd &&
                      "rounded-l-none bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isStart &&
                      isEnd &&
                      "rounded-xl bg-primary text-primary-foreground",
                    day.key === today &&
                      !isStart &&
                      !isEnd &&
                      "ring-1 ring-inset ring-border",
                  )}
                  aria-label={new Intl.DateTimeFormat("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(day.date)}
                >
                  {day.date.getDate()}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3 p-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Время
            <Switch
              checked={timeEnabled}
              onCheckedChange={toggleTime}
              aria-label="Добавить время"
            />
          </label>
          <Button
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={clearAll}
          >
            Очистить
          </Button>
          <Button onClick={applySchedule} disabled={!canApply}>
            Готово
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
