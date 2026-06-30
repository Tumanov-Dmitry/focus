import { hasSupabasePublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type FocusTask = {
  id: string;
  title: string;
  meta: string;
  checked?: boolean;
};

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const mockTodayTasks: FocusTask[] = [
  { id: "mock-1", title: "Название задачи", meta: "Сегодня · 25 минут" },
  { id: "mock-2", title: "Название задачи", meta: "После обеда" },
  { id: "mock-3", title: "Название задачи", meta: "Низкий шум" },
  { id: "mock-4", title: "Закрыть день коротким обзором", meta: "Вечер" },
];

function formatTaskMeta(task: TaskRow) {
  const dateLabel = task.due_on ? "Сегодня" : "Без даты";
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
  };
}

export async function getTodayTasks(): Promise<FocusTask[]> {
  if (!hasSupabasePublicEnv()) {
    return mockTodayTasks;
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("due_on", today)
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(8);

  if (error || !data?.length) {
    return mockTodayTasks;
  }

  return data.map(mapTask);
}
