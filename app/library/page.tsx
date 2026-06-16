import { AppShell } from "@/components/layout/app-shell";
import { CenterColumn } from "@/components/layout/center-column";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return <AppShell><CenterColumn><PageHeader eyebrow="library" title="Раздел в подготовке" description="Пока используем mock-данные и сохраняем минимальный, спокойный ритм интерфейса." /><EmptyState title="Здесь скоро появятся элементы" description="Следующий шаг — подключить Supabase и реальные данные для этого раздела." /></CenterColumn></AppShell>;
}
