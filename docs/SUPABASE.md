# Supabase Cloud

Проект подготовлен к Supabase Cloud, но реальные ключи не хранятся в репозитории.

## Env

Создай `.env.local` и добавь значения из Supabase Project Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` нужен только для серверных административных задач. Не используй его в Client Components.

## Schema

Начальная схема лежит в `supabase/migrations/20260616190000_initial_focus_schema.sql`.

Она создаёт:

- `projects`
- `tasks`
- `library_items`
- enum `task_status`
- enum `task_energy`
- базовые RLS policies для `authenticated` пользователей
- индексы под Today/Inbox сценарии

## Как применить в Supabase Cloud

Если Supabase уже связан с Git, миграция применится через настроенный Supabase workflow.

Если используешь Supabase CLI локально:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

После изменения схемы можно обновить типы:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

## Текущий UI режим

`/today` уже пытается читать задачи из Supabase, если заданы `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Если env нет, Supabase недоступен или пользователь не авторизован, экран использует аккуратные mock-данные, чтобы preview не ломался.
