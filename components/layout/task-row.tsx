import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function TaskRow({
  title,
  meta,
  checked = false,
}: {
  title: string;
  meta?: string;
  checked?: boolean;
}) {
  return (
    <div className="group flex items-start gap-3 border-b py-4 last:border-0">
      <Checkbox checked={checked} className="mt-1" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-6",
            checked && "text-muted-foreground line-through",
          )}
        >
          {title}
        </p>
        {meta ? <p className="mt-1 text-caption text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
}
