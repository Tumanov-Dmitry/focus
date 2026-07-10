// Простой лимитер разборов ИИ: не больше N операций на ключ за скользящее окно.
// Источник-агностичен: ключ — это пользователь, независимо от того, откуда
// пришёл текст (поле ввода, голос, Telegram).
//
// NOTE: счётчик живёт в памяти процесса. На бессерверном рантайме (Vercel)
// инстансы не делят память, поэтому это «мягкий» потолок на инстанс, а не точная
// глобальная квота. Для строгой квоты позже вынести в БД/Redis.

const WINDOW_MS = 60 * 60 * 1000; // час

const hits = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/**
 * Регистрирует попытку под ключом `key` и говорит, укладываемся ли в `limit`
 * операций за последний час. При отказе возвращает, через сколько освободится
 * слот.
 */
export function checkRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );

  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - recent[0]) };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}
