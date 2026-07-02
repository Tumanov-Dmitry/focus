import { hasSupabasePublicEnv } from "@/lib/config/env";
import { dateKey } from "@/lib/date";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskType = Database["public"]["Enums"]["task_type"];

export type FocusTask = {
  checked: boolean;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  estimateMinutes: number | null;
  id: string;
  meta: string;
  priority: TaskPriority;
  projectId: string | null;
  spaceId: string;
  startDate: string | null;
  startTime: string | null;
  status: "open" | "done";
  statusId: string | null;
  title: string;
  type: TaskType;
};

export type FocusTaskPatch = Partial<
  Pick<
    FocusTask,
    | "description"
    | "dueDate"
    | "dueTime"
    | "estimateMinutes"
    | "priority"
    | "projectId"
    | "startDate"
    | "startTime"
    | "statusId"
    | "title"
    | "type"
  >
>;

export type TaskStatusOption = {
  color: string;
  id: string;
  name: string;
  spaceId: string;
};

export type TaskProjectOption = {
  id: string;
  name: string;
  spaceId: string;
};

export type TaskFormOptions = {
  projects: TaskProjectOption[];
  statuses: TaskStatusOption[];
};

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const mockTodayTasks: FocusTask[] = [
  {
    checked: false,
    description: "Собрать основной сценарий и проверить его на реальных данных.",
    dueDate: dateKey(),
    dueTime: null,
    estimateMinutes: 45,
    id: "mock-1",
    meta: "Сегодня · высокий приоритет",
    priority: "high",
    projectId: null,
    spaceId: "mock-space",
    startDate: dateKey(),
    startTime: null,
    status: "open",
    statusId: "mock-status-work",
    title: "Собрать первый экран карточки задачи",
    type: "task",
  },
  {
    checked: false,
    description: null,
    dueDate: dateKey(),
    dueTime: "15:30:00",
    estimateMinutes: 30,
    id: "mock-2",
    meta: "Сегодня · средний приоритет",
    priority: "medium",
    projectId: null,
    spaceId: "mock-space",
    startDate: dateKey(),
    startTime: "15:30:00",
    status: "open",
    statusId: null,
    title: "Созвон по структуре продукта",
    type: "call",
  },
];

const mockTaskOptions: TaskFormOptions = {
  projects: [],
  statuses: [
    { color: "#3b82f6", id: "mock-status-work", name: "В работе", spaceId: "mock-space" },
    { color: "#f59e0b", id: "mock-status-wait", name: "Ждёт", spaceId: "mock-space" },
    { color: "#6b7280", id: "mock-status-pause", name: "На паузе", spaceId: "mock-space" },
  ],
};

function priorityLabel(priority: TaskPriority): string {
  if (priority === "low") return "низкий приоритет";
  if (priority === "medium") return "средний приоритет";
  if (priority === "high") return "высокий приоритет";
  return "без приоритета";
}

function formatTaskMeta(task: Pick<TaskRow, "due_date" | "priority">): string {
  const dateLabel = task.due_date
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
        .format(new Date(`${task.due_date}T00:00:00`))
        .replace(" г.", "")
    : "Без даты";

  return `${dateLabel} · ${priorityLabel(task.priority)}`;
}

export function toFocusTask(task: TaskRow): FocusTask {
  return {
    checked: task.completed_at !== null,
    description: task.description,
    dueDate: task.due_date,
    dueTime: task.due_time,
    estimateMinutes: task.estimate_minutes,
    id: task.id,
    meta: formatTaskMeta(task),
    priority: task.priority,
    projectId: task.project_id,
    spaceId: task.space_id,
    startDate: task.start_date,
    startTime: task.start_time,
    status: task.completed_at ? "done" : "open",
    statusId: task.status_id,
    title: task.title,
    type: task.type,
  };
}

export async function getTodayTasks(): Promise<FocusTask[]> {
  if (!hasSupabasePublicEnv()) {
    return mockTodayTasks;
  }

  const supabase = await createClient();
  const today = dateKey();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .or(
      `and(start_date.lte.${today},due_date.gte.${today}),and(start_date.is.null,due_date.eq.${today})`,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return (data ?? []).map(toFocusTask);
}

export async function getTaskFormOptions(): Promise<TaskFormOptions> {
  if (!hasSupabasePublicEnv()) {
    return mockTaskOptions;
  }

  const supabase = await createClient();
  const [statusesResult, projectsResult] = await Promise.all([
    supabase
      .from("statuses")
      .select("id, name, color, space_id")
      .order("position", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, space_id")
      .order("name", { ascending: true }),
  ]);

  return {
    projects: (projectsResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      spaceId: project.space_id,
    })),
    statuses: (statusesResult.data ?? []).map((status) => ({
      color: status.color,
      id: status.id,
      name: status.name,
      spaceId: status.space_id,
    })),
  };
}
