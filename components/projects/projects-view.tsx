"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProjectAction } from "@/app/(workspace)/projects/actions";
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  return "Без срока";
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
    <>
      <div className="mx-auto w-full max-w-[560px] pb-32 pt-24 sm:pt-28">
        <div className="mb-5 flex items-end justify-between gap-4 px-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Проекты</h1>
            <p className="text-sm text-muted-foreground">Сроки, статус и задачи каждого проекта.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            Архивные
          </label>
        </div>

        <Card className="mb-4 rounded-[20px] bg-background/98 py-0 ring-1 ring-border shadow-[0_22px_64px_-24px_rgb(0_0_0/0.32)] backdrop-blur-2xl">
          <CardContent className="flex items-center gap-1 p-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
              placeholder="Название нового проекта"
              className="h-10 border-0 bg-transparent px-3 text-[15px] shadow-none focus-visible:ring-0"
              aria-label="Новый проект"
            />
            <Button
              size="icon"
              className="rounded-full"
              onClick={create}
              disabled={pending || draft.trim().length === 0}
              aria-label="Создать проект"
            >
              <Plus className="size-[18px]" />
            </Button>
          </CardContent>
        </Card>

        {visible.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <p className="font-medium">Пока нет проектов</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Создайте первый проект, чтобы группировать задачи и следить за сроками.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((project) => (
              <button
                key={project.id}
                onClick={() => setOpenId(project.id)}
                className="w-full text-left"
              >
                <Card className="rounded-[20px] bg-card py-0 ring-1 ring-border shadow-[0_16px_36px_-24px_rgb(0_0_0/0.32)] transition-colors hover:bg-card/70">
                  <CardContent className="p-[14px]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.02em]">
                        {project.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("h-6 shrink-0 rounded-md px-2 text-[10px] font-normal", LIFECYCLE[project.lifecycle].className)}
                      >
                        {LIFECYCLE[project.lifecycle].label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateRange(project.startDate, project.endDate)}</span>
                      <span className="text-border">·</span>
                      <span className="tabular-nums">{formatAmount(project.amount)}</span>
                      <span className="ml-auto tabular-nums">
                        {project.openTaskCount}/{project.taskCount} задач
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <ProjectDetailDialog
        projectId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => router.refresh()}
      />
    </>
  );
}
