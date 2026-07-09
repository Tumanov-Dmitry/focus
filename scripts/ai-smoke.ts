// Смоук-тест провайдера: один запрос в YandexGPT и печать ответа.
// Запуск: npm run ai:smoke  (грузит .env.local и tsx).

import { complete } from "../lib/ai/gateway";

async function main() {
  process.stdout.write("→ Отправляю запрос в YandexGPT…\n");

  const reply = await complete({
    messages: [{ role: "user", content: "Скажи привет" }],
    temperature: 0.3,
  });

  process.stdout.write(`← Ответ модели:\n${reply}\n`);
}

main().catch((error) => {
  console.error("Смоук-тест упал:", error);
  process.exitCode = 1;
});
