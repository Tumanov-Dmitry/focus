import { hasSupabasePublicEnv } from "@/lib/config/env";
import { dateKey } from "@/lib/date";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type FocusTask = {
  id: string;
  title: string;
  meta: string;
  checked: boolean;
  status: "open" | "done";
};

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const mockTodayTasks: FocusTask[] = [
  { id: "mock-1", title: "Название задачи", meta: "Сегодня · средняя энергия", checked: false, status: "open" },
  { id: "mock-2", title: "Название задачи", meta: "После обеда", checked: false, status: "open" },
  { id: "mock-3", title: "Название задачи", meta: "Низкий шум", checked: false, status: "open" },
  { id: "mock-4", title: "Закрыть день коротким обзором", meta: "Вечер", checked: false, status: "open" },
];

function formatTaskMeta(task: TaskRow): string {
  const dateLabel = task.due_date
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
        .format(new Date(`${task.due_date}T00:00:00`))
        .replace(" г.", "")
    : "Без даты";
  const priorityLabel =
    task.priority === "low"
      ? "низкий приоритет"
      : task.priority === "medium"
        ? "средний приоритет"
        : task.priority === "high"
          ? "высокий приоритет"
          : "без приоритета";

  return `${dateLabel} · ${priorityLabel}`;
}

export function toFocusTask(task: TaskRow): FocusTask {
  return {
    id: task.id,
    title: task.title,
    meta: formatTaskMeta(task),
    checked: task.completed_at !== null,
    status: task.completed_at ? "done" : "open",
  };
}

export async function getTodayTasks(): Promise<FocusTask[]> {
  // Without Supabase configured we show placeholder content.
  if (!hasSupabasePublicEnv()) {
    return mockTodayTasks;
  }

  const supabase = await createClient();

  // The page renders a "Сегодня" list, so scope to tasks due today. New tasks
  // created here get due_date = today, so they still appear. RLS scopes the
  // result to the user's spaces; no client-side owner filter is required.
  const today = dateKey();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .eq("due_date", today)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return (data ?? []).map(toFocusTask);
}
