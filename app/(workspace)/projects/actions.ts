"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import {
  getProjectDetail,
  getProjectTasks,
  type ProjectDetail,
  type ProjectLifecycle,
  type StatusCategory,
} from "@/lib/data/projects";
import { toFocusTask, type FocusTask } from "@/lib/data/tasks";
import {
  addProjectStatus,
  createProject,
  createProjectTask,
  deleteProjectStatus,
  ProjectServiceError,
  reorderProjectStatuses,
  updateProjectFields,
  updateProjectStatus,
  type EditableProjectFields,
} from "@/lib/projects/service";

export type ProjectActionResult = { error: string | null; projectId?: string };
export type StatusActionResult = { error: string | null };
export type ProjectTaskResult = { error: string | null; task?: FocusTask };

const ok = { error: null } as const;

function actionError(error: unknown): { error: string } {
  return {
    error:
      error instanceof ProjectServiceError
        ? error.message
        : "Не удалось выполнить действие. Попробуйте ещё раз.",
  };
}

export type ProjectPatch = {
  amount?: number | null;
  description?: string | null;
  endDate?: string | null;
  lifecycle?: ProjectLifecycle;
  name?: string;
  startDate?: string | null;
};

export type ProjectLoadResult = {
  detail?: ProjectDetail;
  error: string | null;
  tasks?: FocusTask[];
};

export async function loadProjectAction(id: string): Promise<ProjectLoadResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  const [detail, tasks] = await Promise.all([
    getProjectDetail(id),
    getProjectTasks(id),
  ]);
  if (!detail) return { error: "Проект не найден." };
  return { detail, error: null, tasks };
}

export async function createProjectAction(name: string): Promise<ProjectActionResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Введите название проекта." };
  }

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const project = await createProject(
      { client: auth.supabase, userId: auth.user.id },
      trimmed.slice(0, 200),
    );
    revalidatePath("/projects");
    return { error: null, projectId: project.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProjectAction(
  id: string,
  patch: ProjectPatch,
): Promise<ProjectActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  const update: Partial<EditableProjectFields> = {};
  if ("name" in patch) {
    const name = patch.name?.trim() ?? "";
    if (!name) return { error: "Название проекта не может быть пустым." };
    update.name = name.slice(0, 200);
  }
  if ("description" in patch) update.description = patch.description?.trim() || null;
  if ("startDate" in patch) update.start_date = patch.startDate || null;
  if ("endDate" in patch) update.end_date = patch.endDate || null;
  if ("lifecycle" in patch) update.lifecycle = patch.lifecycle;
  if ("amount" in patch) {
    const amount = patch.amount ?? null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      return { error: "Укажите корректную сумму." };
    }
    update.amount = amount;
  }

  try {
    await updateProjectFields({ client: auth.supabase, userId: auth.user.id }, id, update);
    revalidatePath("/projects");
    revalidatePath("/today");
    return { error: null, projectId: id };
  } catch (error) {
    return actionError(error);
  }
}

export async function addStatusAction(
  projectId: string,
  name: string,
  category: StatusCategory,
): Promise<StatusActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Введите название статуса." };

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await addProjectStatus(
      { client: auth.supabase, userId: auth.user.id },
      projectId,
      { category, name: trimmed.slice(0, 100) },
    );
    revalidatePath("/projects");
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function updateStatusAction(
  statusId: string,
  input: { category?: StatusCategory; name?: string },
): Promise<StatusActionResult> {
  const patch: { category?: StatusCategory; name?: string } = {};
  if ("name" in input) {
    const name = input.name?.trim() ?? "";
    if (!name) return { error: "Название статуса не может быть пустым." };
    patch.name = name.slice(0, 100);
  }
  if ("category" in input) patch.category = input.category;

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await updateProjectStatus({ client: auth.supabase, userId: auth.user.id }, statusId, patch);
    revalidatePath("/projects");
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function reorderStatusesAction(
  projectId: string,
  orderedIds: string[],
): Promise<StatusActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await reorderProjectStatuses(
      { client: auth.supabase, userId: auth.user.id },
      projectId,
      orderedIds,
    );
    revalidatePath("/projects");
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteStatusAction(
  statusId: string,
  targetStatusId: string | null,
): Promise<StatusActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    await deleteProjectStatus(
      { client: auth.supabase, userId: auth.user.id },
      statusId,
      targetStatusId,
    );
    revalidatePath("/projects");
    return ok;
  } catch (error) {
    return actionError(error);
  }
}

export async function createProjectTaskAction(
  projectId: string,
  title: string,
): Promise<ProjectTaskResult> {
  const trimmed = title.trim();
  if (!trimmed) return { error: "Введите название задачи." };

  const auth = await requireUser();
  if (!auth.ok) return { error: auth.error };

  try {
    const task = await createProjectTask(
      { client: auth.supabase, userId: auth.user.id },
      projectId,
      trimmed.slice(0, 500),
    );
    revalidatePath("/projects");
    revalidatePath("/today");
    return { error: null, task: toFocusTask(task) };
  } catch (error) {
    return actionError(error);
  }
}
