import { hasSupabasePublicEnv } from "@/lib/config/env";
import { toFocusTask, type FocusTask } from "@/lib/data/tasks";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type ProjectLifecycle = "active" | "completed" | "archived";
export type StatusCategory = "not_started" | "in_progress" | "done";

export type ProjectStatus = {
  category: StatusCategory;
  color: string;
  id: string;
  name: string;
  position: number;
};

export type ProjectListItem = {
  amount: number | null;
  endDate: string | null;
  id: string;
  lifecycle: ProjectLifecycle;
  name: string;
  openTaskCount: number;
  startDate: string | null;
  taskCount: number;
};

export type ProjectDetail = {
  amount: number | null;
  description: string | null;
  endDate: string | null;
  id: string;
  lifecycle: ProjectLifecycle;
  name: string;
  spaceId: string;
  startDate: string | null;
  statuses: ProjectStatus[];
};

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type StatusRow = Database["public"]["Tables"]["statuses"]["Row"];

function toLifecycle(value: string): ProjectLifecycle {
  return value === "completed" || value === "archived" ? value : "active";
}

function toCategory(value: string): StatusCategory {
  return value === "not_started" || value === "done" ? value : "in_progress";
}

export function toProjectStatus(status: StatusRow): ProjectStatus {
  return {
    category: toCategory(status.category),
    color: status.color,
    id: status.id,
    name: status.name,
    position: status.position,
  };
}

export async function getProjects(options?: {
  includeArchived?: boolean;
}): Promise<ProjectListItem[]> {
  if (!hasSupabasePublicEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, name, lifecycle, start_date, end_date, amount, tasks(id, completed_at, deleted_at)")
    .order("name", { ascending: true });

  if (!options?.includeArchived) {
    query = query.neq("lifecycle", "archived");
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((project) => {
    const tasks = (project.tasks ?? []).filter((task) => task.deleted_at === null);
    return {
      amount: project.amount,
      endDate: project.end_date,
      id: project.id,
      lifecycle: toLifecycle(project.lifecycle),
      name: project.name,
      openTaskCount: tasks.filter((task) => task.completed_at === null).length,
      startDate: project.start_date,
      taskCount: tasks.length,
    };
  });
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: project, error }, { data: statuses }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single<ProjectRow>(),
    supabase
      .from("statuses")
      .select("*")
      .eq("project_id", id)
      .order("position", { ascending: true }),
  ]);

  if (error || !project) {
    return null;
  }

  return {
    amount: project.amount,
    description: project.description,
    endDate: project.end_date,
    id: project.id,
    lifecycle: toLifecycle(project.lifecycle),
    name: project.name,
    spaceId: project.space_id,
    startDate: project.start_date,
    statuses: (statuses ?? []).map(toProjectStatus),
  };
}

export async function getProjectTasks(projectId: string): Promise<FocusTask[]> {
  if (!hasSupabasePublicEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map(toFocusTask);
}
