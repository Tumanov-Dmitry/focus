import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

type FocusSupabaseClient = SupabaseClient<Database>;
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
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
