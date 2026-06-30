import { AiInputBar } from "@/components/layout/ai-input-bar";
import { AppShell } from "@/components/layout/app-shell";
import { CenterColumn } from "@/components/layout/center-column";
import { PageHeader } from "@/components/layout/page-header";
import { SectionLabel } from "@/components/layout/section-label";
import { TaskRow } from "@/components/layout/task-row";
import { getTodayTasks } from "@/lib/data/tasks";

export default async function TodayPage() {
  const tasks = await getTodayTasks();

  return (
    <AppShell>
      <CenterColumn>
        <PageHeader
          eyebrow="Сегодня"
          title="Спокойный план на день"
          description="Только важное: несколько задач, короткие контексты и одна строка для быстрого ввода."
        />
        <SectionLabel>В фокусе</SectionLabel>
        <div className="mb-8 rounded-xl border bg-card px-5">
          {tasks.map((task) => (
            <TaskRow key={task.id} {...task} />
          ))}
        </div>
        <AiInputBar />
      </CenterColumn>
    </AppShell>
  );
}
