import { Button } from "@/components/ui/button";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 px-8 py-14 text-center">
      <h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button className="mt-6" variant="outline">
        Создать первую задачу
      </Button>
    </div>
  );
}
