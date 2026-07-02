"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { dateKey } from "@/lib/date";
import {
  toFocusTask,
  type FocusTask,
  type FocusTaskPatch,
  type TaskChecklistItem,
  type TaskComment,
  type TaskExtras,
  type TaskLink,
} from "@/lib/data/tasks";
import type { Database } from "@/lib/supabase/database.types";
import {
  addChecklistItem,
  addTaskComment,
  addTaskLink,
  createInboxTask,
  duplicateTask,
  getTaskExtras,
  removeChecklistItem,
  removeTaskComment,
  removeTaskLink,
  reorderChecklistItems,
  setChecklistItemDone,
  setTaskCompletion,
  TaskServiceError,
  trashTask,
  updateTaskFields,
  type EditableTaskFields,
} from "@/lib/tasks/service";

export type TaskActionResult = { error: string | null; task?: FocusTask };

const ok: TaskActionResult = { error: null };

function today(): string {
  return dateKey();
}

function actionError(error: unknown): TaskActionResult {
  return {
    error:
      error instanceof TaskServiceError
        ? error.message
        : "Не удалось выполнить действие. Попробуйте ещё раз.",
  };
}

export async function createTask(title: string): Promise<TaskActionResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "Введите название задачи." };
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    const task = await createInboxTask(
      { client: auth.supabase, userId: auth.user.id },
      { dueDate: today(), title: trimmed },
    );
    revalidatePath("/today");
    return { error: null, task: toFocusTask(task) };
  } catch (error) {
    return actionError(error);
  }
}

export async function setTaskDone(id: string, done: boolean): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    await setTaskCompletion(
      { client: auth.supabase, userId: auth.user.id },
      id,
      done,
    );
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/today");
  return ok;
}

export async function deleteTask(id: string): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    await trashTask({ client: auth.supabase, userId: auth.user.id }, id);
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/today");
  return ok;
}

export async function updateTask(
  id: string,
  patch: FocusTaskPatch,
): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  const update: Partial<EditableTaskFields> = {};

  if ("title" in patch) {
    const title = patch.title?.trim() ?? "";
    if (!title) return { error: "Название задачи не может быть пустым." };
    update.title = title.slice(0, 500);
  }
  if ("description" in patch) {
    update.description = patch.description?.trim() || null;
  }
  if ("type" in patch) update.type = patch.type;
  if ("priority" in patch) update.priority = patch.priority;
  if ("statusId" in patch) update.status_id = patch.statusId;
  if ("projectId" in patch) update.project_id = patch.projectId;
  if ("dueDate" in patch) {
    update.due_date = patch.dueDate || null;
    if (!patch.dueDate) {
      update.due_time = null;
      update.start_date = null;
      update.start_time = null;
    }
  }
  if ("dueTime" in patch) update.due_time = patch.dueTime || null;
  if ("startDate" in patch) {
    update.start_date = patch.startDate || null;
    if (!patch.startDate) update.start_time = null;
  }
  if ("startTime" in patch) update.start_time = patch.startTime || null;
  if ("estimateMinutes" in patch) {
    const estimate = patch.estimateMinutes ?? null;
    if (
      estimate !== null &&
      (!Number.isInteger(estimate) || estimate < 0 || estimate > 100_000)
    ) {
      return { error: "Укажите корректную оценку времени." };
    }
    update.estimate_minutes = estimate;
  }

  try {
    const task = await updateTaskFields(
      { client: auth.supabase, userId: auth.user.id },
      id,
      update,
    );
    revalidatePath("/today");
    return { error: null, task: toFocusTask(task) };
  } catch (error) {
    return actionError(error);
  }
}

export async function duplicateTaskAction(id: string): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    const task = await duplicateTask(
      { client: auth.supabase, userId: auth.user.id },
      id,
    );
    revalidatePath("/today");
    return { error: null, task: toFocusTask(task) };
  } catch (error) {
    return actionError(error);
  }
}

export type TaskExtrasResult = {
  error: string | null;
  extras?: TaskExtras;
};

export type ChecklistItemResult = {
  error: string | null;
  item?: TaskChecklistItem;
};

export type TaskLinkResult = {
  error: string | null;
  link?: TaskLink;
};

export type TaskCommentResult = {
  comment?: TaskComment;
  error: string | null;
};

function checklistItemResult(
  item: Database["public"]["Tables"]["checklist_items"]["Row"],
): TaskChecklistItem {
  return {
    content: item.content,
    id: item.id,
    isDone: item.is_done,
    position: item.position,
  };
}

function taskLinkResult(
  link: Database["public"]["Tables"]["task_links"]["Row"],
): TaskLink {
  return {
    id: link.id,
    position: link.position,
    title: link.title,
    url: link.url,
  };
}

export async function loadTaskExtras(id: string): Promise<TaskExtrasResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const extras = await getTaskExtras(
      { client: auth.supabase, userId: auth.user.id },
      id,
    );
    return {
      error: null,
      extras: {
        checklist: extras.checklist.map(checklistItemResult),
        comments: extras.comments.map((comment) => ({
          body: comment.body,
          createdAt: comment.created_at,
          id: comment.id,
          isOwn: comment.author_id === auth.user.id,
        })),
        links: extras.links.map(taskLinkResult),
      },
    };
  } catch (error) {
    return { error: actionError(error).error };
  }
}

export async function createChecklistItemAction(
  taskId: string,
  content: string,
): Promise<ChecklistItemResult> {
  const value = content.trim();
  if (!value) return { error: "Введите текст пункта." };

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const item = await addChecklistItem(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      value.slice(0, 500),
    );
    return { error: null, item: checklistItemResult(item) };
  } catch (error) {
    return { error: actionError(error).error };
  }
}

export async function toggleChecklistItemAction(
  taskId: string,
  itemId: string,
  done: boolean,
): Promise<ChecklistItemResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const item = await setChecklistItemDone(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      itemId,
      done,
    );
    return { error: null, item: checklistItemResult(item) };
  } catch (error) {
    return { error: actionError(error).error };
  }
}

export async function deleteChecklistItemAction(
  taskId: string,
  itemId: string,
): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await removeChecklistItem(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      itemId,
    );
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function reorderChecklistAction(
  taskId: string,
  itemIds: string[],
): Promise<TaskActionResult> {
  if (new Set(itemIds).size !== itemIds.length) {
    return { error: "Некорректный порядок чеклиста." };
  }

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await reorderChecklistItems(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      itemIds,
    );
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function createTaskLinkAction(
  taskId: string,
  rawUrl: string,
): Promise<TaskLinkResult> {
  const candidate = rawUrl.trim();
  if (!candidate) return { error: "Введите ссылку." };

  let parsed: URL;
  try {
    parsed = new URL(
      candidate.startsWith("http://") || candidate.startsWith("https://")
        ? candidate
        : `https://${candidate}`,
    );
  } catch {
    return { error: "Введите корректный URL." };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { error: "Поддерживаются только http и https ссылки." };
  }

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const link = await addTaskLink(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      {
        title: parsed.hostname.replace(/^www\./, ""),
        url: parsed.toString(),
      },
    );
    return { error: null, link: taskLinkResult(link) };
  } catch (error) {
    return { error: actionError(error).error };
  }
}

export async function deleteTaskLinkAction(
  taskId: string,
  linkId: string,
): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await removeTaskLink(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      linkId,
    );
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function createTaskCommentAction(
  taskId: string,
  body: string,
): Promise<TaskCommentResult> {
  const value = body.trim();
  if (!value) return { error: "Введите комментарий." };

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const comment = await addTaskComment(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      value.slice(0, 5_000),
    );
    return {
      comment: {
        body: comment.body,
        createdAt: comment.created_at,
        id: comment.id,
        isOwn: true,
      },
      error: null,
    };
  } catch (error) {
    return { error: actionError(error).error };
  }
}

export async function deleteTaskCommentAction(
  taskId: string,
  commentId: string,
): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await removeTaskComment(
      { client: auth.supabase, userId: auth.user.id },
      taskId,
      commentId,
    );
    return ok;
  } catch (error) {
    return actionError(error);
  }
}
