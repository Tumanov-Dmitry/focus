// Смоук-тест разбора Входящих: прогоняет несколько формулировок через
// parseInboxText и печатает предложенные задачи. Запуск: npm run ai:parse
//
// Проверяем примеры из Definition of Done шага 2: разбор с пунктуацией и без.

import { parseInboxText, type ParseContext } from "../lib/ai/parse-inbox";

const context: ParseContext = {
  // Псевдо-проект с валидным uuid, чтобы проверить подстановку project_id.
  projects: [{ id: "11111111-1111-1111-1111-111111111111", name: "Билайн" }],
  today: new Date().toISOString().slice(0, 10),
  timezone: "Europe/Moscow",
};

const samples = [
  "Завтра созвон с Леной в 16:00 по КП Билайна, срочно, и подготовить само КП до пятницы",
  "так надо бы созвониться с леной завтра ну и кп доделать наверное до пятницы",
  "встретиться с командой во вторник обсудить релиз",
  "позвонить в банк на следующей неделе, не срочно",
  "купить молоко",
  "срочно оплатить хостинг сегодня до 18:00",
  "через неделю проверить метрики по Билайну",
  "в четверг сделать отчёт",
];

async function main() {
  process.stdout.write(`Сегодня: ${context.today} (${context.timezone})\n\n`);

  for (const text of samples) {
    process.stdout.write(`▶ Вход: ${text}\n`);
    const tasks = await parseInboxText(text, context);
    process.stdout.write(`  Предложено задач: ${tasks.length}\n`);
    for (const task of tasks) {
      process.stdout.write(`  ${JSON.stringify(task)}\n`);
    }
    process.stdout.write("\n");
  }
}

main().catch((error) => {
  console.error("Смоук-тест разбора упал:", error);
  process.exitCode = 1;
});
