import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

type FocusSupabaseClient = SupabaseClient<Database>;
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type ChecklistRow = Database["public"]["Tables"]["checklist_items"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type TaskLinkRow = Database["public"]["Tables"]["task_links"]["Row"];
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
      start_date: input.dueDate,
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
          start_date: task.start_date,
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
  | "start_date"
  | "start_time"
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
      : changedKeys.some(
            (key) =>
              key === "due_date" ||
              key === "due_time" ||
              key === "start_date" ||
              key === "start_time",
          )
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
        start_date: currentTask.start_date,
        start_time: currentTask.start_time,
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
      start_date: sourceTask.start_date,
      start_time: sourceTask.start_time,
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

function assertTaskActive(task: Pick<TaskRow, "deleted_at">) {
  if (task.deleted_at) {
    throw new TaskServiceError("Нельзя изменить задачу в корзине.");
  }
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

export async function getTaskExtras(
  context: TaskMutationContext,
  taskId: string,
): Promise<{
  checklist: ChecklistRow[];
  comments: CommentRow[];
  links: TaskLinkRow[];
}> {
  const [checklistResult, linksResult, commentsResult] = await Promise.all([
    context.client
      .from("checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true }),
    context.client
      .from("task_links")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true }),
    context.client
      .from("comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
  ]);

  const error =
    checklistResult.error ?? linksResult.error ?? commentsResult.error;
  if (error) {
    throw new TaskServiceError(error.message);
  }

  return {
    checklist: checklistResult.data ?? [],
    comments: commentsResult.data ?? [],
    links: linksResult.data ?? [],
  };
}

export async function addChecklistItem(
  context: TaskMutationContext,
  taskId: string,
  content: string,
): Promise<ChecklistRow> {
  const task = await getMutableTask(context, taskId);
  if (task.deleted_at) {
    throw new TaskServiceError("Нельзя изменить задачу в корзине.");
  }

  const { data: lastItem } = await context.client
    .from("checklist_items")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: item, error } = await context.client
    .from("checklist_items")
    .insert({
      content,
      position: (lastItem?.position ?? -1) + 1,
      task_id: taskId,
    })
    .select("*")
    .single();

  if (error || !item) {
    throw new TaskServiceError(error?.message ?? "Не удалось добавить пункт.");
  }

  try {
    await writeActivity(context, {
      action: "updated",
      entityId: taskId,
      payload: {
        new: {
          checklist_item: {
            content: item.content,
            id: item.id,
          },
        },
      },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client.from("checklist_items").delete().eq("id", item.id);
    throw activityError;
  }

  return item;
}

export async function setChecklistItemDone(
  context: TaskMutationContext,
  taskId: string,
  itemId: string,
  done: boolean,
): Promise<ChecklistRow> {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: previous, error: readError } = await context.client
    .from("checklist_items")
    .select("*")
    .eq("id", itemId)
    .eq("task_id", taskId)
    .single();

  if (readError || !previous) {
    throw new TaskServiceError(readError?.message ?? "Пункт не найден.");
  }

  const { data: item, error } = await context.client
    .from("checklist_items")
    .update({ is_done: done })
    .eq("id", itemId)
    .eq("task_id", taskId)
    .select("*")
    .single();

  if (error || !item) {
    throw new TaskServiceError(error?.message ?? "Не удалось обновить пункт.");
  }

  try {
    await writeActivity(context, {
      action: "updated",
      entityId: taskId,
      payload: {
        new: { checklist_item: { id: itemId, is_done: done } },
        old: { checklist_item: { id: itemId, is_done: previous.is_done } },
      },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client
      .from("checklist_items")
      .update({ is_done: previous.is_done })
      .eq("id", itemId);
    throw activityError;
  }

  return item;
}

export async function removeChecklistItem(
  context: TaskMutationContext,
  taskId: string,
  itemId: string,
) {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: previous, error: readError } = await context.client
    .from("checklist_items")
    .select("*")
    .eq("id", itemId)
    .eq("task_id", taskId)
    .single();

  if (readError || !previous) {
    throw new TaskServiceError(readError?.message ?? "Пункт не найден.");
  }

  const { error } = await context.client
    .from("checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("task_id", taskId);
  if (error) throw new TaskServiceError(error.message);

  try {
    await writeActivity(context, {
      action: "updated",
      entityId: taskId,
      payload: { old: { checklist_item: previous } },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client.from("checklist_items").insert(previous);
    throw activityError;
  }
}

export async function reorderChecklistItems(
  context: TaskMutationContext,
  taskId: string,
  itemIds: string[],
) {
  const { error } = await context.client.rpc("reorder_checklist_items", {
    p_item_ids: itemIds,
    p_task_id: taskId,
  });
  if (error) throw new TaskServiceError(error.message);
}

export async function addTaskLink(
  context: TaskMutationContext,
  taskId: string,
  input: { title: string | null; url: string },
): Promise<TaskLinkRow> {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: lastLink } = await context.client
    .from("task_links")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: link, error } = await context.client
    .from("task_links")
    .insert({
      position: (lastLink?.position ?? -1) + 1,
      task_id: taskId,
      title: input.title,
      url: input.url,
    })
    .select("*")
    .single();

  if (error || !link) {
    throw new TaskServiceError(error?.message ?? "Не удалось добавить ссылку.");
  }

  try {
    await writeActivity(context, {
      action: "updated",
      entityId: taskId,
      payload: { new: { task_link: { id: link.id, url: link.url } } },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client.from("task_links").delete().eq("id", link.id);
    throw activityError;
  }

  return link;
}

export async function removeTaskLink(
  context: TaskMutationContext,
  taskId: string,
  linkId: string,
) {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: previous, error: readError } = await context.client
    .from("task_links")
    .select("*")
    .eq("id", linkId)
    .eq("task_id", taskId)
    .single();

  if (readError || !previous) {
    throw new TaskServiceError(readError?.message ?? "Ссылка не найдена.");
  }

  const { error } = await context.client
    .from("task_links")
    .delete()
    .eq("id", linkId)
    .eq("task_id", taskId);
  if (error) throw new TaskServiceError(error.message);

  try {
    await writeActivity(context, {
      action: "updated",
      entityId: taskId,
      payload: { old: { task_link: previous } },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client.from("task_links").insert(previous);
    throw activityError;
  }
}

export async function addTaskComment(
  context: TaskMutationContext,
  taskId: string,
  body: string,
): Promise<CommentRow> {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: comment, error } = await context.client
    .from("comments")
    .insert({
      author_id: context.userId,
      body,
      task_id: taskId,
    })
    .select("*")
    .single();

  if (error || !comment) {
    throw new TaskServiceError(error?.message ?? "Не удалось добавить комментарий.");
  }

  try {
    await writeActivity(context, {
      action: "commented",
      entityId: taskId,
      payload: { new: { comment_id: comment.id } },
      spaceId: task.space_id,
    });
  } catch (activityError) {
    await context.client.from("comments").delete().eq("id", comment.id);
    throw activityError;
  }

  return comment;
}

export async function removeTaskComment(
  context: TaskMutationContext,
  taskId: string,
  commentId: string,
) {
  const task = await getMutableTask(context, taskId);
  assertTaskActive(task);
  const { data: comment, error: readError } = await context.client
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("task_id", taskId)
    .single();

  if (readError || !comment || comment.author_id !== context.userId) {
    throw new TaskServiceError(readError?.message ?? "Комментарий не найден.");
  }

  const { error } = await context.client
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("task_id", taskId);
  if (error) throw new TaskServiceError(error.message);
}
