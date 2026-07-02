import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

type FocusSupabaseClient = SupabaseClient<Database>;
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type ActivityAction = Database["public"]["Enums"]["activity_action"];

type TaskMutationContext = {
  client: FocusSupabaseClient;
  userId: string;
};

export class TaskServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskServiceError";
  }
}

async function getPersonalSpaceId(
  client: FocusSupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await client
    .from("spaces")
    .select("id")
    .eq("owner_id", userId)
    .eq("kind", "personal")
    .single();

  if (error || !data) {
    throw new TaskServiceError(error?.message ?? "Личное пространство не найдено.");
  }

  return data.id;
}

async function writeActivity(
  context: TaskMutationContext,
  input: {
    action: ActivityAction;
    entityId: string;
    payload?: Json;
    spaceId: string;
  },
) {
  const { error } = await context.client.from("activity_log").insert({
    action: input.action,
    actor_id: context.userId,
    entity_id: input.entityId,
    entity_type: "task",
    payload: input.payload ?? {},
    space_id: input.spaceId,
  });

  if (error) {
    throw new TaskServiceError(error.message);
  }
}

export async function createInboxTask(
  context: TaskMutationContext,
  input: { dueDate: string; title: string },
): Promise<TaskRow> {
  const spaceId = await getPersonalSpaceId(context.client, context.userId);
  const { data: task, error } = await context.client
    .from("tasks")
    .insert({
      created_by: context.userId,
      due_date: input.dueDate,
      source: "inbox",
      space_id: spaceId,
      title: input.title,
    })
    .select("*")
    .single();

  if (error || !task) {
    throw new TaskServiceError(error?.message ?? "Не удалось создать задачу.");
  }

  try {
    await writeActivity(context, {
      action: "created",
      entityId: task.id,
      payload: {
        new: {
          due_date: task.due_date,
          project_id: task.project_id,
          source: task.source,
          title: task.title,
        },
      },
      spaceId,
    });
  } catch (activityError) {
    await context.client.from("tasks").delete().eq("id", task.id);
    throw activityError;
  }

  return task;
}

export type EditableTaskFields = Pick<
  TaskUpdate,
  | "description"
  | "due_date"
  | "due_time"
  | "estimate_minutes"
  | "priority"
  | "project_id"
  | "status_id"
  | "title"
  | "type"
>;

export async function updateTaskFields(
  context: TaskMutationContext,
  taskId: string,
  input: Partial<EditableTaskFields>,
): Promise<TaskRow> {
  const { data: currentTask, error: readError } = await context.client
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (readError || !currentTask) {
    throw new TaskServiceError(readError?.message ?? "Задача не найдена.");
  }

  const changedEntries = Object.entries(input).filter(
    ([key, value]) => currentTask[key as keyof TaskRow] !== value,
  );
  if (changedEntries.length === 0) {
    return currentTask;
  }

  const update = Object.fromEntries(changedEntries) as Partial<EditableTaskFields>;
  const { data: updatedTask, error: updateError } = await context.client
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (updateError || !updatedTask) {
    throw new TaskServiceError(updateError?.message ?? "Не удалось обновить задачу.");
  }

  const changedKeys = changedEntries.map(([key]) => key);
  const action: ActivityAction = changedKeys.includes("status_id")
    ? "status_changed"
    : changedKeys.includes("priority")
      ? "priority_changed"
      : changedKeys.some((key) => key === "due_date" || key === "due_time")
        ? "rescheduled"
        : "updated";

  const oldValues: Record<string, Json> = {};
  const newValues: Record<string, Json> = {};
  for (const [key, value] of changedEntries) {
    oldValues[key] = currentTask[key as keyof TaskRow] as Json;
    newValues[key] = value as Json;
  }

  try {
    await writeActivity(context, {
      action,
      entityId: taskId,
      payload: { new: newValues, old: oldValues },
      spaceId: currentTask.space_id,
    });
  } catch (activityError) {
    await context.client
      .from("tasks")
      .update({
        description: currentTask.description,
        due_date: currentTask.due_date,
        due_time: currentTask.due_time,
        estimate_minutes: currentTask.estimate_minutes,
        priority: currentTask.priority,
        project_id: currentTask.project_id,
        status_id: currentTask.status_id,
        title: currentTask.title,
        type: currentTask.type,
      })
      .eq("id", taskId);
    throw activityError;
  }

  return updatedTask;
}

export async function duplicateTask(
  context: TaskMutationContext,
  taskId: string,
): Promise<TaskRow> {
  const { data: sourceTask, error: readError } = await context.client
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (readError || !sourceTask) {
    throw new TaskServiceError(readError?.message ?? "Задача не найдена.");
  }

  const { data: copy, error: insertError } = await context.client
    .from("tasks")
    .insert({
      created_by: context.userId,
      description: sourceTask.description,
      due_date: sourceTask.due_date,
      due_time: sourceTask.due_time,
      estimate_minutes: sourceTask.estimate_minutes,
      priority: sourceTask.priority,
      project_id: sourceTask.project_id,
      source: "manual",
      space_id: sourceTask.space_id,
      status_id: sourceTask.status_id,
      title: `${sourceTask.title} — копия`,
      type: sourceTask.type,
    })
    .select("*")
    .single();

  if (insertError || !copy) {
    throw new TaskServiceError(insertError?.message ?? "Не удалось дублировать задачу.");
  }

  try {
    await writeActivity(context, {
      action: "duplicated",
      entityId: copy.id,
      payload: { source_task_id: sourceTask.id },
      spaceId: copy.space_id,
    });
  } catch (activityError) {
    await context.client.from("tasks").delete().eq("id", copy.id);
    throw activityError;
  }

  return copy;
}

async function getMutableTask(
  context: TaskMutationContext,
  taskId: string,
): Promise<Pick<TaskRow, "completed_at" | "deleted_at" | "id" | "space_id">> {
  const { data, error } = await context.client
    .from("tasks")
    .select("id, space_id, completed_at, deleted_at")
    .eq("id", taskId)
    .single();

  if (error || !data) {
    throw new TaskServiceError(error?.message ?? "Задача не найдена.");
  }

  return data;
}

export async function setTaskCompletion(
  context: TaskMutationContext,
  taskId: string,
  done: boolean,
) {
  const task = await getMutableTask(context, taskId);
  if (task.deleted_at) {
    throw new TaskServiceError("Нельзя изменить задачу в корзине.");
  }

  const completedAt = done ? new Date().toISOString() : null;
  const { error } = await context.client
    .from("tasks")
    .update({ completed_at: completedAt })
    .eq("id", task.id)
    .is("deleted_at", null);

  if (error) {
    throw new TaskServiceError(error.message);
  }

  try {
    await writeActivity(context, {
      action: done ? "completed" : "uncompleted",
      entityId: task.id,
      payload: {
        new: { completed_at: completedAt },
        old: { completed_at: task.completed_at },
      },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client
      .from("tasks")
      .update({ completed_at: task.completed_at })
      .eq("id", task.id);
    throw activityError;
  }
}

export async function trashTask(context: TaskMutationContext, taskId: string) {
  const task = await getMutableTask(context, taskId);
  if (task.deleted_at) return;

  const deletedAt = new Date().toISOString();
  const { error } = await context.client
    .from("tasks")
    .update({ deleted_at: deletedAt })
    .eq("id", task.id)
    .is("deleted_at", null);

  if (error) {
    throw new TaskServiceError(error.message);
  }

  try {
    await writeActivity(context, {
      action: "trashed",
      entityId: task.id,
      payload: {
        new: { deleted_at: deletedAt },
        old: { deleted_at: task.deleted_at },
      },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client
      .from("tasks")
      .update({ deleted_at: task.deleted_at })
      .eq("id", task.id);
    throw activityError;
  }
}
