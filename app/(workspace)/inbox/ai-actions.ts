"use server";

// Server Actions ИИ-разбора Входящих. Концептуально не привязаны к UI: их же
// будут дёргать голосовой ввод и Telegram-бот — на вход приходит плоский текст.
// Всё под фичефлагом AI_ENABLED; при выключенном ИИ экшены отвечают отказом, но
// ничего не ломают в остальном приложении.

import { z } from "zod";

import {
  parseInboxText,
  ParsedTaskSchema,
  type ParsedTask,
} from "@/lib/ai/parse-inbox";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { AiParseError, AiUnavailableError, isAiEnabled } from "@/lib/ai/shared";
import { requireUser } from "@/lib/auth/require-user";
import { getProjects } from "@/lib/data/projects";
import { toFocusTask, type FocusTask } from "@/lib/data/tasks";
import { dateKey, DEFAULT_TIME_ZONE } from "@/lib/date";
import {
  createInboxTask,
  TaskServiceError,
  updateTaskFields,
} from "@/lib/tasks/service";

/** Потолок разборов на пользователя в час (DoD: срабатывает на 21-м). */
const PARSES_PER_HOUR = 20;

/** Минимальная длина текста — держим согласованной с кнопкой в UI (шаг 4). */
const MIN_TEXT_LENGTH = 15;

const AI_DISABLED_MESSAGE = "ИИ-разбор сейчас недоступен.";
const PARSE_FAILURE_MESSAGE =
  "Не получилось разобрать. Попробуйте переформулировать или создайте задачи вручную.";
const UNAVAILABLE_MESSAGE =
  "ИИ временно недоступен. Попробуйте позже или создайте задачи вручную.";

export type SuggestResult = {
  error: string | null;
  suggestions: ParsedTask[];
};

/**
 * Разбирает произвольный текст в предложения задач. Не создаёт ничего —
 * только предлагает. Ошибки отдаются человекочитаемым полем `error`, наружу не
 * бросаются.
 */
export async function suggestTasksFromText(
  text: string,
): Promise<SuggestResult> {
  if (!isAiEnabled()) {
    return { error: AI_DISABLED_MESSAGE, suggestions: [] };
  }

  const trimmed = text.trim();
  if (trimmed.length < MIN_TEXT_LENGTH) {
    return { error: "Добавьте больше деталей для разбора.", suggestions: [] };
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return { error: auth.error, suggestions: [] };
  }

  const limit = checkRateLimit(`ai-parse:${auth.user.id}`, PARSES_PER_HOUR);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60_000));
    return {
      error: `Слишком много разборов за час. Попробуйте через ${minutes} мин.`,
      suggestions: [],
    };
  }

  try {
    const projects = await getProjects();
    const suggestions = await parseInboxText(trimmed, {
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
      })),
      today: dateKey(),
      timezone: DEFAULT_TIME_ZONE,
    });
    return { error: null, suggestions };
  } catch (error) {
    if (error instanceof AiParseError) {
      return { error: PARSE_FAILURE_MESSAGE, suggestions: [] };
    }
    if (error instanceof AiUnavailableError) {
      return { error: UNAVAILABLE_MESSAGE, suggestions: [] };
    }
    return {
      error: "Не удалось выполнить разбор. Попробуйте ещё раз.",
      suggestions: [],
    };
  }
}

export type AcceptResult = {
  created: FocusTask[];
  failed: { error: string; title: string }[];
  error: string | null;
};

/**
 * Создаёт задачи из подтверждённых предложений через сервисный слой:
 * createInboxTask (source='ai') + updateTaskFields — чтобы activity_log писался
 * как обычно. Частичный успех допустим: возвращаем и созданные, и упавшие.
 */
export async function acceptSuggestions(
  tasks: ParsedTask[],
): Promise<AcceptResult> {
  if (!isAiEnabled()) {
    return { created: [], failed: [], error: AI_DISABLED_MESSAGE };
  }

  // Данные пришли с клиента — валидируем повторно, не доверяя форме.
  const parsed = z.array(ParsedTaskSchema).max(10).safeParse(tasks);
  if (!parsed.success) {
    return { created: [], failed: [], error: "Некорректные данные предложений." };
  }
  if (parsed.data.length === 0) {
    return { created: [], failed: [], error: "Нечего создавать." };
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return { created: [], failed: [], error: auth.error };
  }

  const context = { client: auth.supabase, userId: auth.user.id };

  // Проект принимаем, только если он реально принадлежит пользователю —
  // клиент мог прислать чужой или устаревший id.
  const projects = await getProjects();
  const ownProjectIds = new Set(projects.map((project) => project.id));

  const created: FocusTask[] = [];
  const failed: { error: string; title: string }[] = [];

  for (const task of parsed.data) {
    try {
      const row = await createInboxTask(context, {
        dueDate: task.due_date,
        source: "ai",
        title: task.title,
      });

      const projectId =
        task.project_id && ownProjectIds.has(task.project_id)
          ? task.project_id
          : null;

      const updated = await updateTaskFields(context, row.id, {
        due_time: task.due_date ? task.due_time : null,
        priority: task.priority,
        project_id: projectId,
        type: task.type,
      });

      created.push(toFocusTask(updated));
    } catch (error) {
      failed.push({
        error:
          error instanceof TaskServiceError
            ? error.message
            : "Не удалось создать задачу.",
        title: task.title,
      });
    }
  }

  return { created, failed, error: null };
}
