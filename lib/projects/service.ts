import type { SupabaseClient } from "@supabase/supabase-js";

import type { StatusCategory } from "@/lib/data/projects";
import type { Database } from "@/lib/supabase/database.types";

type FocusSupabaseClient = SupabaseClient<Database>;
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type StatusRow = Database["public"]["Tables"]["statuses"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

type ProjectContext = {
  client: FocusSupabaseClient;
  userId: string;
};

export class ProjectServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

const STATUS_COLORS: Record<StatusCategory, string> = {
  done: "#22c55e",
  in_progress: "#3b82f6",
  not_started: "#6b7280",
};

async function getPersonalSpaceId(context: ProjectContext): Promise<string> {
  const { data, error } = await context.client
    .from("spaces")
    .select("id")
    .eq("owner_id", context.userId)
    .eq("kind", "personal")
    .single();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Личное пространство не найдено.");
  }

  return data.id;
}

export async function createProject(
  context: ProjectContext,
  name: string,
): Promise<ProjectRow> {
  const spaceId = await getPersonalSpaceId(context);
  const { data, error } = await context.client
    .rpc("create_project_with_statuses", { p_name: name, p_space_id: spaceId })
    .single<ProjectRow>();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Не удалось создать проект.");
  }

  return data;
}

export type EditableProjectFields = Pick<
  ProjectUpdate,
  "amount" | "description" | "end_date" | "lifecycle" | "name" | "start_date"
>;

export async function updateProjectFields(
  context: ProjectContext,
  projectId: string,
  input: Partial<EditableProjectFields>,
): Promise<ProjectRow> {
  const { data, error } = await context.client
    .from("projects")
    .update(input)
    .eq("id", projectId)
    .select("*")
    .single<ProjectRow>();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Не удалось обновить проект.");
  }

  return data;
}

async function getProjectSpaceId(
  context: ProjectContext,
  projectId: string,
): Promise<string> {
  const { data, error } = await context.client
    .from("projects")
    .select("space_id")
    .eq("id", projectId)
    .single();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Проект не найден.");
  }

  return data.space_id;
}

export async function addProjectStatus(
  context: ProjectContext,
  projectId: string,
  input: { category: StatusCategory; name: string },
): Promise<StatusRow> {
  const spaceId = await getProjectSpaceId(context, projectId);
  const { data: last } = await context.client
    .from("statuses")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await context.client
    .from("statuses")
    .insert({
      category: input.category,
      color: STATUS_COLORS[input.category],
      name: input.name,
      position: (last?.position ?? -1) + 1,
      project_id: projectId,
      space_id: spaceId,
    })
    .select("*")
    .single<StatusRow>();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Не удалось добавить статус.");
  }

  return data;
}

export async function updateProjectStatus(
  context: ProjectContext,
  statusId: string,
  input: { category?: StatusCategory; name?: string },
): Promise<StatusRow> {
  const { data, error } = await context.client
    .from("statuses")
    .update(input)
    .eq("id", statusId)
    .select("*")
    .single<StatusRow>();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Не удалось обновить статус.");
  }

  return data;
}

export async function reorderProjectStatuses(
  context: ProjectContext,
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await context.client
      .from("statuses")
      .update({ position: index })
      .eq("id", orderedIds[index])
      .eq("project_id", projectId);
    if (error) {
      throw new ProjectServiceError(error.message);
    }
  }
}

export async function createProjectTask(
  context: ProjectContext,
  projectId: string,
  title: string,
): Promise<TaskRow> {
  const spaceId = await getProjectSpaceId(context, projectId);
  const { data, error } = await context.client
    .from("tasks")
    .insert({
      created_by: context.userId,
      project_id: projectId,
      source: "manual",
      space_id: spaceId,
      title,
    })
    .select("*")
    .single<TaskRow>();

  if (error || !data) {
    throw new ProjectServiceError(error?.message ?? "Не удалось создать задачу.");
  }

  return data;
}

export async function deleteProjectStatus(
  context: ProjectContext,
  statusId: string,
  targetStatusId: string | null,
): Promise<void> {
  const { error } = await context.client.rpc("delete_status_reassign", {
    p_status_id: statusId,
    // The RPC accepts null (reassign to "no status"); generated types omit it.
    p_target_status_id: targetStatusId as string,
  });

  if (error) {
    const message = error.message.includes("last done status")
      ? "Нельзя удалить последний статус категории «Готово»."
      : error.message;
    throw new ProjectServiceError(message);
  }
}
