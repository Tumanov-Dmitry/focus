"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";

export type TaskActionResult = { error: string | null };

const ok: TaskActionResult = { error: null };

function today(): string {
  return new Date().toISOString().slice(0, 10);
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

  const { error } = await auth.supabase.from("tasks").insert({
    owner_id: auth.user.id,
    title: trimmed,
    due_on: today(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return ok;
}

export async function setTaskDone(id: string, done: boolean): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase
    .from("tasks")
    .update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return ok;
}

export async function deleteTask(id: string): Promise<TaskActionResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return ok;
}
