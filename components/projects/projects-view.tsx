"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProjectAction } from "@/app/projects/actions";
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ProjectLifecycle, ProjectListItem } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

const LIFECYCLE: Record<ProjectLifecycle, { className: string; label: string }> = {
  active: { className: "", label: "Активен" },
  archived: { className: "text-muted-foreground", label: "В архиве" },
  completed: { className: "text-emerald-600 dark:text-emerald-400", label: "Завершён" },
};

function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (value: string) =>
    new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
      .format(new Date(`${value}T00:00:00`))
      .replace(".", "");
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `с ${fmt(start)}`;
  if (end) return `до ${fmt(end)}`;
  return "—";
}

function formatAmount(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount) + " ₽";
}

export function ProjectsView({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = projects.filter((p) => showArchived || p.lifecycle !== "archived");

  function create() {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    startTransition(async () => {
      const result = await createProjectAction(name);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
        if (result.projectId) setOpenId(result.projectId);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="text-sm text-muted-foreground">
            Сроки, статус и задачи каждого проекта.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Архивные
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
          placeholder="Название нового проекта"
        />
        <Button onClick={create} disabled={pending || draft.trim().length === 0}>
          Создать
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Пока нет проектов</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте первый проект, чтобы группировать задачи и следить за сроками.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground sm:grid">
            <span>Проект</span>
            <span>Статус</span>
            <span>Сроки</span>
            <span className="text-right">Сумма</span>
            <span className="text-right">Задачи</span>
          </div>
          {visible.map((project) => (
            <button
              key={project.id}
              onClick={() => setOpenId(project.id)}
              className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-1 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/40 sm:grid-cols-[1fr_auto_auto_auto_auto]"
            >
              <span className="font-medium">{project.name}</span>
              <Badge variant="outline" className={cn("justify-self-start", LIFECYCLE[project.lifecycle].className)}>
                {LIFECYCLE[project.lifecycle].label}
              </Badge>
              <span className="text-muted-foreground">{formatDateRange(project.startDate, project.endDate)}</span>
              <span className="tabular-nums sm:text-right">{formatAmount(project.amount)}</span>
              <span className="tabular-nums text-muted-foreground sm:text-right">
                {project.openTaskCount}/{project.taskCount}
              </span>
            </button>
          ))}
        </div>
      )}

      <ProjectDetailDialog
        projectId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
