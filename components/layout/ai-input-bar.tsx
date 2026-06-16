import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AiInputBar() {
  return (
    <div className="focus-surface flex items-center gap-2 rounded-2xl p-2">
      <Sparkles className="ml-2 h-4 w-4 text-accent" />
      <Input
        className="h-9 border-0 shadow-none focus-visible:ring-0"
        placeholder="Добавить задачу или спросить Фокус…"
      />
      <Button size="sm">Ввести</Button>
    </div>
  );
}
