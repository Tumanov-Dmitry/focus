"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";

import {
  createChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistAction,
  toggleChecklistItemAction,
} from "@/app/today/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskChecklistItem } from "@/lib/data/tasks";

type TaskChecklistProps = {
  initialItems: TaskChecklistItem[];
  onItemsChange?: (items: TaskChecklistItem[]) => void;
  taskId: string;
};

function withPositions(items: TaskChecklistItem[]): TaskChecklistItem[] {
  return items.map((item, position) => ({ ...item, position }));
}

export function TaskChecklist({
  initialItems,
  onItemsChange,
  taskId,
}: TaskChecklistProps) {
  const [items, setItems] = useState(() => withPositions(initialItems));
  const [draft, setDraft] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const doneCount = items.filter((item) => item.isDone).length;
  const progress = items.length === 0 ? 0 : (doneCount / items.length) * 100;

  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);

  function addItem() {
    const content = draft.trim();
    if (!content || pending) return;
    const previous = items;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticItem: TaskChecklistItem = {
      content,
      id: optimisticId,
      isDone: false,
      position: items.length,
    };
    setDraft("");
    setItems(withPositions([...items, optimisticItem]));

    startTransition(async () => {
      const result = await createChecklistItemAction(taskId, content);
      if (result.error || !result.item) {
        toast.error(result.error ?? "Не удалось добавить пункт");
        setItems(previous);
        setDraft(content);
        return;
      }
      const createdItem = result.item;
      setItems((current) =>
        withPositions(
          current.map((item) =>
            item.id === optimisticId ? createdItem : item,
          ),
        ),
      );
    });
  }

  function toggleItem(itemId: string, done: boolean) {
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, isDone: done } : item,
      ),
    );

    startTransition(async () => {
      const result = await toggleChecklistItemAction(
        taskId,
        itemId,
        done,
      );
      if (result.error) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  function deleteItem(itemId: string) {
    const previous = items;
    setItems((current) =>
      withPositions(current.filter((item) => item.id !== itemId)),
    );

    startTransition(async () => {
      const result = await deleteChecklistItemAction(taskId, itemId);
      if (result.error) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  function persistOrder(nextItems: TaskChecklistItem[]) {
    const previous = items;
    const next = withPositions(nextItems);
    setItems(next);

    startTransition(async () => {
      const result = await reorderChecklistAction(
        taskId,
        next.map((item) => item.id),
      );
      if (result.error) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  function moveItem(itemId: string, targetId: string) {
    if (itemId === targetId || pending) return;
    const sourceIndex = items.findIndex((item) => item.id === itemId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    persistOrder(next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (draggedId) moveItem(draggedId, targetId);
    setDraggedId(null);
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Подзадачи</h3>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={!pending}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
              setDraggedId(item.id);
            }}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, item.id)}
            className={cn(
              "group flex min-h-11 items-center gap-2 rounded-xl border bg-background/70 px-2 transition-opacity",
              draggedId === item.id && "opacity-45",
            )}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing" />
            <Checkbox
              checked={item.isDone}
              disabled={pending}
              onCheckedChange={(value) =>
                toggleItem(item.id, value === true)
              }
              aria-label={`Выполнить: ${item.content}`}
            />
            <span
              className={cn(
                "min-w-0 flex-1 py-2 text-sm",
                item.isDone && "text-muted-foreground line-through",
              )}
            >
              {item.content}
            </span>
            <div className="flex shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending || index === 0}
                onClick={() => moveItem(item.id, items[index - 1]?.id)}
                aria-label={`Поднять: ${item.content}`}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending || index === items.length - 1}
                onClick={() => moveItem(item.id, items[index + 1]?.id)}
                aria-label={`Опустить: ${item.content}`}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                onClick={() => deleteItem(item.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Удалить: ${item.content}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Добавить пункт"
          className="h-10 bg-background/70"
          maxLength={500}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={addItem}
          disabled={pending || !draft.trim()}
          aria-label="Добавить пункт чеклиста"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </section>
  );
}
