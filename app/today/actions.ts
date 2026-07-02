"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { dateKey } from "@/lib/date";
import {
  toFocusTask,
  type FocusTask,
  type FocusTaskPatch,
} from "@/lib/data/tasks";
import {
  createInboxTask,
  duplicateTask,
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
    if (!patch.dueDate) update.due_time = null;
  }
  if ("dueTime" in patch) update.due_time = patch.dueTime || null;
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
