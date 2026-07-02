"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { dateKey } from "@/lib/date";
import { toFocusTask, type FocusTask } from "@/lib/data/tasks";
import {
  createInboxTask,
  setTaskCompletion,
  TaskServiceError,
  trashTask,
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
