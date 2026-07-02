"use client";

import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createTaskLinkAction,
  deleteTaskLinkAction,
} from "@/app/today/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskLink } from "@/lib/data/tasks";

type TaskLinksProps = {
  initialLinks: TaskLink[];
  onLinksChange?: (links: TaskLink[]) => void;
  taskId: string;
};

export function TaskLinks({
  initialLinks,
  onLinksChange,
  taskId,
}: TaskLinksProps) {
  const [links, setLinks] = useState(initialLinks);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onLinksChange?.(links);
  }, [links, onLinksChange]);

  function addLink() {
    const url = draft.trim();
    if (!url || pending) return;
    const previous = links;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
    const optimisticLink: TaskLink = {
      id: optimisticId,
      position: links.length,
      title: url,
      url: optimisticUrl,
    };
    setDraft("");
    setLinks([...links, optimisticLink]);

    startTransition(async () => {
      const result = await createTaskLinkAction(taskId, url);
      if (result.error || !result.link) {
        toast.error(result.error ?? "Не удалось добавить ссылку");
        setLinks(previous);
        setDraft(url);
        return;
      }
      const createdLink = result.link;
      setLinks((current) =>
        current.map((link) =>
          link.id === optimisticId ? createdLink : link,
        ),
      );
    });
  }

  function deleteLink(linkId: string) {
    const previous = links;
    setLinks((current) => current.filter((link) => link.id !== linkId));

    startTransition(async () => {
      const result = await deleteTaskLinkAction(taskId, linkId);
      if (result.error) {
        toast.error(result.error);
        setLinks(previous);
      }
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Ссылки</h3>
        {links.length > 0 ? (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {links.length}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5">
        {links.map((link) => (
          <div
            key={link.id}
            className="group flex min-h-12 items-center gap-3 rounded-xl border bg-background/70 px-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </div>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 py-2 outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="truncate text-sm font-medium">
                {link.title ?? link.url}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {link.url}
              </p>
            </a>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={pending}
              onClick={() => deleteLink(link.id)}
              className="shrink-0 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              aria-label={`Удалить ссылку ${link.title ?? link.url}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          type="url"
          inputMode="url"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addLink();
            }
          }}
          placeholder="Вставьте URL"
          className="h-10 bg-background/70"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={addLink}
          disabled={pending || !draft.trim()}
          aria-label="Добавить ссылку"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </section>
  );
}
