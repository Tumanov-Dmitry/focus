# Фокус

AI-first таск-трекер и рабочее пространство: задачи, проекты и планирование в одном спокойном экране. Next.js 15 (App Router) + Supabase.

**Прод:** https://focus-etenshen.vercel.app

## Возможности

- **Аутентификация** по email/паролю (Supabase Auth) с подтверждением почты; защита роутов через middleware.
- **Личное пространство** у каждого пользователя (`spaces` + membership); весь доступ ограничен RLS по членству в пространстве.
- **Задачи:** быстрое создание (Enter → инбокс) и полная форма — тип (задача/созвон/встреча), приоритет, статус, дата/время, оценка, описание.
- **Карточка задачи** с инлайн-редактированием: чеклист, ссылки, комментарии, пикер расписания; действия «выполнить/перенести/удалить в корзину».
- **Проекты** и **кастомные статусы** (сид: «В работе», «Ждёт», «На паузе»).
- **Недельный планировщик** и воркспейс с уровнями «Деск / Фокус / План».
- Модель данных также готова под учёт времени (таймер) и историю изменений (`activity_log`).

## Стек

- **Next.js 15.5** (App Router, Server Actions, middleware), **React 18.2**, **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (radix-ui), `motion`, `sonner`
- **Supabase** (PostgreSQL 17, Auth, RLS) через `@supabase/ssr`
- Хостинг: **Vercel** (деплой из ветки `main`)

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить значениями Supabase
npm run dev
```

Приложение стартует на http://localhost:3000. Без публичных env-переменных работает в mock-режиме (демо-данные, без гейта авторизации).

## Переменные окружения

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — опционально, для серверных задач

## База данных

Миграции лежат в `supabase/migrations/`. Схема: `spaces` / `space_members`, `projects`, `tasks`, `statuses`, а также спутники задачи — `checklist_items`, `task_links`, `time_entries`, `comments`, `task_assignees` и append-only `activity_log`. Доступ ко всем таблицам ограничивает RLS по членству в пространстве. Подробности подключения Supabase Cloud — в [`docs/SUPABASE.md`](docs/SUPABASE.md).

## Скрипты

- `npm run dev` — дев-сервер
- `npm run build` — прод-сборка
- `npm run lint` — ESLint
- `npm run typecheck` — проверка типов (`tsc --noEmit`)

## Документация

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — обзор и цели
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — архитектура
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — дизайн-система
- [`docs/SUPABASE.md`](docs/SUPABASE.md) — подключение Supabase
- [`docs/TASK_TEMPLATE.md`](docs/TASK_TEMPLATE.md) — шаблон ТЗ для новых задач
