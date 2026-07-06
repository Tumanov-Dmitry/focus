"use client";

import { MessageSquareText, Send, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createTaskCommentAction,
  deleteTaskCommentAction,
} from "@/app/(workspace)/today/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TaskComment } from "@/lib/data/tasks";

type TaskCommentsProps = {
  initialComments: TaskComment[];
  onCommentsChange?: (comments: TaskComment[]) => void;
  taskId: string;
};

const commentDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "Europe/Moscow",
});

export function TaskComments({
  initialComments,
  onCommentsChange,
  taskId,
}: TaskCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onCommentsChange?.(comments);
  }, [comments, onCommentsChange]);

  function addComment() {
    const body = draft.trim();
    if (!body || pending) return;
    const previous = comments;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticComment: TaskComment = {
      body,
      createdAt: new Date().toISOString(),
      id: optimisticId,
      isOwn: true,
    };
    setDraft("");
    setComments([...comments, optimisticComment]);

    startTransition(async () => {
      const result = await createTaskCommentAction(taskId, body);
      if (result.error || !result.comment) {
        toast.error(result.error ?? "Не удалось добавить комментарий");
        setComments(previous);
        setDraft(body);
        return;
      }
      const createdComment = result.comment;
      setComments((current) =>
        current.map((comment) =>
          comment.id === optimisticId ? createdComment : comment,
        ),
      );
    });
  }

  function deleteComment(commentId: string) {
    const previous = comments;
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );

    startTransition(async () => {
      const result = await deleteTaskCommentAction(taskId, commentId);
      if (result.error) {
        toast.error(result.error);
        setComments(previous);
      }
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Комментарии</h3>
        {comments.length > 0 ? (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {comments.length}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="group rounded-2xl border bg-background/70 p-3"
          >
            <header className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {comment.isOwn ? "Вы" : "Участник"}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={comment.createdAt}>
                {commentDateFormatter.format(new Date(comment.createdAt))}
              </time>
              {comment.isOwn ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={pending}
                  onClick={() => deleteComment(comment.id)}
                  className="ml-auto -mr-1 -mt-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label="Удалить комментарий"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </header>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {comment.body}
            </p>
          </article>
        ))}
      </div>

      <div className="relative mt-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              addComment();
            }
          }}
          placeholder="Написать комментарий…"
          className="min-h-20 bg-background/70 pr-12"
          maxLength={5_000}
        />
        <Button
          size="icon-sm"
          onClick={addComment}
          disabled={pending || !draft.trim()}
          className="absolute bottom-2 right-2 rounded-full"
          aria-label="Отправить комментарий"
        >
          <Send className="size-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
        Ctrl + Enter
      </p>
    </section>
  );
}
