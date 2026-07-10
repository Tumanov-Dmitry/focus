// Разбор плоского текста во Входящих в структурированные предложения задач.
// Источник текста разбору неизвестен: поле быстрого ввода, расшифровка голоса
// (SpeechKit) или Telegram — на вход всегда приходит просто строка.
//
// Здесь нет работы с БД: модуль только превращает текст в кандидатов ParsedTask.
// Их создание через сервисный слой — забота Server Actions на следующем шаге.

import { z } from "zod";

import { complete, type ChatMessage } from "@/lib/ai/gateway";
import { AiParseError } from "@/lib/ai/shared";

/** Одна предложенная задача. Совпадает по форме с ожиданием от модели. */
export const ParsedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["task", "call", "meeting"]),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  priority: z.enum(["none", "low", "medium", "high"]),
  project_id: z.string().uuid().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

export const ParseResultSchema = z.object({
  tasks: z.array(ParsedTaskSchema).max(10),
});

export type ParseResult = z.infer<typeof ParseResultSchema>;

/** Контекст пользователя для разбора: проекты, «сегодня» и таймзона. */
export type ParseContext = {
  projects: { id: string; name: string }[];
  /** Дата пользователя «сегодня» в формате YYYY-MM-DD. */
  today: string;
  /** IANA-таймзона пользователя, например "Europe/Moscow". */
  timezone: string;
};

const PARSE_TEMPERATURE = 0.1;

// Дни недели в порядке getUTCDay(): 0 — воскресенье … 6 — суббота.
const RU_WEEKDAYS = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

/** Дата через `offset` дней от `base` в формате YYYY-MM-DD. */
function isoPlusDays(base: Date, offset: number): string {
  return new Date(base.getTime() + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Готовые опорные даты для относительных сроков. lite-модель ненадёжно считает
 * день недели по дате, поэтому всю арифметику делаем здесь и отдаём ей прямым
 * словарём «день недели → точная дата» — модели остаётся лишь подставить.
 * Считаем от полудня UTC, чтобы календарная дата не съезжала из-за таймзоны.
 */
function buildDateAnchors(today: string): string {
  const base = new Date(`${today}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return "(опорные даты недоступны)";
  }

  const todayDow = base.getUTCDay();

  // Ближайшая будущая дата каждого дня недели (offset 1..7; сегодняшний день
  // недели → через неделю, т.к. «в четверг» в четверг означает следующий).
  const weekdayLines = [1, 2, 3, 4, 5, 6, 0].map((targetDow) => {
    const offset = ((targetDow - todayDow + 6) % 7) + 1;
    return `- ${RU_WEEKDAYS[targetDow]} → ${isoPlusDays(base, offset)}`;
  });

  // Понедельник следующей недели для «на следующей неделе».
  const nextMondayOffset = ((1 - todayDow + 6) % 7) + 1;

  return [
    `- сегодня → ${today}`,
    `- завтра → ${isoPlusDays(base, 1)}`,
    `- послезавтра → ${isoPlusDays(base, 2)}`,
    ...weekdayLines,
    `- на следующей неделе (понедельник) → ${isoPlusDays(base, nextMondayOffset)}`,
    `- через неделю → ${isoPlusDays(base, 7)}`,
  ].join("\n");
}

function buildSystemPrompt(context: ParseContext): string {
  const projectList =
    context.projects.length > 0
      ? context.projects
          .map((project) => `- ${project.name} (id: ${project.id})`)
          .join("\n")
      : "(проектов нет)";

  return `Ты — разборщик входящих заметок в приложении для задач. На вход приходит свободный текст: пользователь мог напечатать его, надиктовать голосом или прислать в мессенджере. Твоя задача — выделить из него конкретные задачи и вернуть их строго в JSON.

Сегодня: ${context.today} (таймзона пользователя: ${context.timezone}).

Опорные даты — бери значение ровно отсюда, ничего не вычисляй сам:
${buildDateAnchors(context.today)}

Проекты пользователя:
${projectList}

Правила разбора:
- Из одного текста может следовать несколько задач — выдели каждую отдельно. Если задача одна, верни одну.
- Поле type: обычное дело → "task"; созвон, звонок, «набрать», «позвонить» → "call"; встреча, «встретиться», «увидеться» → "meeting".
- Срок клади в due_date как YYYY-MM-DD, подставляя дату из списка «Опорные даты»:
  - «сегодня»/«завтра»/«послезавтра» → одноимённая опорная дата;
  - названный день недели («в пятницу», «до пятницы», «во вторник») → строка того же дня недели из опорных дат (там уже учтено, что берётся ближайший будущий день);
  - «на следующей неделе» → опорная дата «на следующей неделе», «через неделю» → опорная «через неделю».
  - Не придумывай даты, которых нет в списке. Если срок не назван — due_date = null.
- due_time заполняй только если явно назван час («в 16:00», «к 9 утра» → "09:00»). Иначе due_time = null.
- priority ставь высокий только при явном сигнале срочности («срочно», «горит», «как можно скорее» → "high»). Без сигнала — "none". "low" и "medium" используй лишь при явных формулировках («не срочно», «когда будет время» → "low»).
- project_id: подставляй проект из списка выше, ТОЛЬКО если его название буквально встречается в тексте задачи (в любой падежной форме: «Билайн», «Билайна», «по Билайну»). Бери ровно тот id, что указан в скобках. Тематической близости недостаточно: слова «релиз», «команда», «метрики», «отчёт» сами по себе не привязывают задачу к проекту — нужно само название. Если названия в тексте нет — project_id = null. Лучше null, чем угаданный проект. Не выдумывай id.
- title — короткая глагольная формулировка задачи («Позвонить Лене по КП», «Подготовить КП для Билайна»), без служебных слов вроде «надо бы» и «наверное».
- confidence — насколько ты уверен в задаче, число от 0 до 1.

Устная речь: текст может быть без пунктуации, с разговорными оборотами и словами-паразитами («ну», «наверное», «короче»). Игнорируй их и всё равно извлекай суть.

Формат ответа: только JSON-объект вида {"tasks": [ ... ]}, без markdown, без пояснений, без обёрток из тройных кавычек. Каждая задача — объект с полями title, type, due_date, due_time, priority, project_id, confidence. Если задач нет — верни {"tasks": []}.`;
}

/** Срезает возможную ```json … ```-обёртку и лишний текст вокруг JSON. */
function stripJsonFences(raw: string): string {
  let text = raw.trim();

  // Убираем ограждение из тройных кавычек, если модель им обернула ответ.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    text = fenced[1].trim();
  }

  // На случай пояснений вокруг: берём от первой { до последней }.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

/**
 * Пытается привести сырой ответ модели к {@link ParseResult}.
 * Кидает Error с человекочитаемой причиной — её же скармливаем модели при
 * повторном запросе.
 */
function parseModelResponse(raw: string): ParseResult {
  const cleaned = stripJsonFences(raw);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("Ответ не является корректным JSON.");
  }

  const result = ParseResultSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `JSON не соответствует схеме: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  return result.data;
}

/**
 * Санитайзит project_id, оставляя его только когда он действительно обоснован.
 * Обнуляем в двух случаях: (1) id нет в списке проектов пользователя — модель
 * выдумала валидный по форме uuid; (2) названия проекта нет в исходном тексте —
 * модель привязала задачу к проекту «по смыслу» («релиз» → единственный проект).
 * Лучше отдать null и дать пользователю выбрать проект в карточке, чем угадывать.
 */
function reconcileProjects(
  tasks: ParsedTask[],
  projects: ParseContext["projects"],
  sourceText: string,
): ParsedTask[] {
  const byId = new Map(projects.map((project) => [project.id, project.name]));
  const haystack = sourceText.toLowerCase();

  return tasks.map((task) => {
    if (!task.project_id) return task;
    const name = byId.get(task.project_id);
    if (!name || !haystack.includes(name.toLowerCase())) {
      return { ...task, project_id: null };
    }
    return task;
  });
}

/**
 * Разбирает плоский текст в предложения задач.
 *
 * При невалидном ответе делает один повторный запрос с текстом ошибки; если и
 * он не проходит — бросает {@link AiParseError}. Ошибки доступности модели
 * (сеть, ключ, лимит) поднимаются из слоя gateway как AiUnavailableError.
 */
export async function parseInboxText(
  text: string,
  context: ParseContext,
): Promise<ParsedTask[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(context) },
    { role: "user", content: trimmed },
  ];

  const firstRaw = await complete({ messages, temperature: PARSE_TEMPERATURE });

  try {
    const result = parseModelResponse(firstRaw);
    return reconcileProjects(result.tasks, context.projects, trimmed);
  } catch (firstError) {
    // Один повтор: показываем модели её ответ и в чём он не подошёл.
    const reason =
      firstError instanceof Error ? firstError.message : String(firstError);
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: firstRaw },
      {
        role: "user",
        content: `Ответ не подошёл: ${reason} Верни только валидный JSON вида {"tasks": [...]} по описанной схеме, без markdown и пояснений.`,
      },
    ];

    const secondRaw = await complete({
      messages: retryMessages,
      temperature: PARSE_TEMPERATURE,
    });

    try {
      const result = parseModelResponse(secondRaw);
      return reconcileProjects(result.tasks, context.projects, trimmed);
    } catch (secondError) {
      const secondReason =
        secondError instanceof Error
          ? secondError.message
          : String(secondError);
      throw new AiParseError(
        `Не удалось разобрать ответ ИИ после повтора: ${secondReason}`,
      );
    }
  }
}
