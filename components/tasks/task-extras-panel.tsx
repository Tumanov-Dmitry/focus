"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { loadTaskExtras } from "@/app/today/actions";
import { TaskChecklist } from "@/components/tasks/task-checklist";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskLinks } from "@/components/tasks/task-links";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskExtras } from "@/lib/data/tasks";

export function TaskExtrasPanel({ taskId }: { taskId: string }) {
  const [extras, setExtras] = useState<TaskExtras | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setExtras(null);
    setError(null);

    void loadTaskExtras(taskId).then((result) => {
      if (ignore) return;
      if (result.error || !result.extras) {
        setError(result.error ?? "Не удалось загрузить данные задачи.");
        return;
      }
      setExtras(result.extras);
    });

    return () => {
      ignore = true;
    };
  }, [reloadKey, taskId]);

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">{error}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          <RefreshCw className="size-4" />
          Повторить
        </Button>
      </div>
    );
  }

  if (!extras) {
    return (
      <div className="space-y-6" aria-label="Загрузка содержимого задачи">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TaskChecklist taskId={taskId} initialItems={extras.checklist} />
      <TaskLinks taskId={taskId} initialLinks={extras.links} />
      <TaskComments taskId={taskId} initialComments={extras.comments} />
    </div>
  );
}
