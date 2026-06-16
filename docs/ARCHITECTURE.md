# Architecture

## Стек

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style компоненты
- Supabase Cloud / Auth / PostgreSQL

## Структура

- `app/` — маршруты и глобальные стили.
- `components/ui/` — базовые shadcn/ui компоненты.
- `components/layout/` — продуктовые layout-компоненты Фокуса.
- `lib/supabase/` — browser/server Supabase clients и типы базы.
- `lib/data/` — серверные data access функции с fallback на mock-данные.
- `supabase/migrations/` — SQL migrations для Supabase Cloud.
- `docs/` — проектная документация.
