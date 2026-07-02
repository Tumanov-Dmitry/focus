import { hasSupabasePublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type FocusTask = {
  id: string;
  title: string;
  meta: string;
  checked: boolean;
  status: "open" | "done" | "archived";
};

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const mockTodayTasks: FocusTask[] = [
  { id: "mock-1", title: "Название задачи", meta: "Сегодня · средняя энергия", checked: false, status: "open" },
  { id: "mock-2", title: "Название задачи", meta: "После обеда", checked: false, status: "open" },
  { id: "mock-3", title: "Название задачи", meta: "Низкий шум", checked: false, status: "open" },
  { id: "mock-4", title: "Закрыть день коротким обзором", meta: "Вечер", checked: false, status: "open" },
];

function formatTaskMeta(task: TaskRow): string {
  const dateLabel = task.due_on
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
        .format(new Date(`${task.due_on}T00:00:00`))
        .replace(" г.", "")
    : "Без даты";
  const energyLabel =
    task.energy === "low"
      ? "низкая энергия"
      : task.energy === "high"
        ? "высокая энергия"
        : "средняя энергия";

  return `${dateLabel} · ${energyLabel}`;
}

function mapTask(task: TaskRow): FocusTask {
  return {
    id: task.id,
    title: task.title,
    meta: formatTaskMeta(task),
    checked: task.status === "done",
    status: task.status,
  };
}

export async function getTodayTasks(): Promise<FocusTask[]> {
  // Without Supabase configured we show placeholder content.
  if (!hasSupabasePublicEnv()) {
    return mockTodayTasks;
  }

  const supabase = await createClient();

  // The page renders a "Сегодня" list, so scope to tasks due today. New tasks
  // created here get due_on = today, so they still appear. RLS scopes the
  // result to the authenticated user; no client-side owner filter is required.
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "archived")
    .eq("due_on", today)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return (data ?? []).map(mapTask);
}
