# Фокус

Минималистичный AI-first таск-трекер на Next.js 15, TypeScript, Tailwind CSS, shadcn/ui и Supabase.

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase

Начальная схема находится в `supabase/migrations/20260616190000_initial_focus_schema.sql`. Подробности подключения Supabase Cloud — в `docs/SUPABASE.md`.

`/today` читает задачи из Supabase при наличии публичных env-переменных и автоматически использует mock-данные, если Supabase ещё не подключён или пользователь не авторизован.
