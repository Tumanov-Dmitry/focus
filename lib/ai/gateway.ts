// LLM-провайдер. YandexGPT через OpenAI-совместимый endpoint Yandex Cloud.
// Модуль знает только про «отправить сообщения — получить текст»; ничего про
// задачи, входящие или источник текста здесь нет.

import OpenAI from "openai";

import {
  AI_REQUEST_TIMEOUT_MS,
  AiUnavailableError,
  getAiEnv,
  withRetries,
} from "@/lib/ai/shared";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const YANDEX_BASE_URL = "https://llm.api.cloud.yandex.net/v1";

/** Не повторяем auth/лимит; повторяем сетевые и серверные (5xx) сбои. */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 429) return false;
    return error.status === undefined || error.status >= 500;
  }
  // Ошибки соединения/таймаута приходят без HTTP-статуса — их повторяем.
  return true;
}

/**
 * Один вызов чат-модели. Возвращает текстовый ответ.
 * Модель адресуется как `gpt://<folder>/<model>` согласно формату Yandex Cloud.
 */
export async function complete({
  messages,
  temperature = 0.3,
}: {
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  const { apiKey, folderId, model } = getAiEnv();

  const client = new OpenAI({
    apiKey,
    baseURL: YANDEX_BASE_URL,
    timeout: AI_REQUEST_TIMEOUT_MS,
    maxRetries: 0, // повторы — на нашей стороне, в withRetries
    defaultHeaders: {
      "x-folder-id": folderId,
      "x-data-logging-enabled": "false",
    },
  });

  const modelUri = `gpt://${folderId}/${model}`;

  const completion = await withRetries(
    () =>
      client.chat.completions.create({
        model: modelUri,
        temperature,
        messages,
      }),
    { isRetryable },
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new AiUnavailableError("Пустой ответ от модели.");
  }

  return content;
}
