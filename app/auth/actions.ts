"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthResult = {
  error: string | null;
  message: string | null;
};

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email ещё не подтверждён — проверьте почту.";
  }
  if (normalized.includes("user already registered")) {
    return "Пользователь с таким email уже зарегистрирован.";
  }
  if (normalized.includes("password should be at least")) {
    return "Пароль должен быть не короче 6 символов.";
  }
  return message;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { error: "Введите email и пароль.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { error: translateAuthError(error.message), message: null };
  }

  revalidatePath("/", "layout");
  redirect("/today");
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { error: "Введите email и пароль.", message: null };
  }
  if (password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов.", message: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { error: translateAuthError(error.message), message: null };
  }

  // With email confirmation enabled there is no active session yet.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/today");
  }

  return {
    error: null,
    message: "Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
