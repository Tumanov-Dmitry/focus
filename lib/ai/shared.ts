// Общие примитивы AI-слоя: доступ к env, типизированные ошибки и политика
// повторов/таймаута. Всё здесь намеренно не привязано к источнику текста.
//
// NOTE: распознавание речи (SpeechKit, речь → текст) появится рядом как
// `lib/ai/stt.ts`. Оно будет отдавать плоский текст в тот же пайплайн разбора,
// поэтому этот модуль остаётся источник-агностичным.

/** Жёсткий таймаут на один запрос к модели. */
export const AI_REQUEST_TIMEOUT_MS = 30_000;

/** Число повторов на сетевые/серверные сбои (сверх первой попытки). */
export const AI_MAX_RETRIES = 2;

/** ИИ выключен, не настроен или временно недоступен. */
export class AiUnavailableError extends Error {
  constructor(message = "ИИ недоступен.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/** Модель ответила, но ответ не удалось привести к ожидаемой структуре. */
export class AiParseError extends Error {
  constructor(message = "Не удалось разобрать ответ ИИ.") {
    super(message);
    this.name = "AiParseError";
  }
}

export type AiEnv = {
  apiKey: string;
  folderId: string;
  model: string;
};

/** Фичефлаг всей ИИ-функциональности. */
export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}

/**
 * Читает и валидирует конфигурацию провайдера из окружения.
 * Бросает {@link AiUnavailableError}, если чего-то не хватает.
 */
export function getAiEnv(): AiEnv {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  const model = process.env.AI_MODEL;

  if (!apiKey || !folderId || !model) {
    throw new AiUnavailableError(
      "ИИ не настроен: задайте YANDEX_API_KEY, YANDEX_FOLDER_ID и AI_MODEL.",
    );
  }

  return { apiKey, folderId, model };
}

/**
 * Повторяет `fn` при возвратных ошибках с экспоненциальным бэкоффом.
 * Возвратность определяет вызывающая сторона через `isRetryable`
 * (например, 401/429 не повторяем — они сами не пройдут).
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: {
    isRetryable: (error: unknown) => boolean;
    retries?: number;
    baseDelayMs?: number;
  },
): Promise<T> {
  const retries = options.retries ?? AI_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !options.isRetryable(error)) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
