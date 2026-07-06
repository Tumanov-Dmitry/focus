import { ShellPage, ShellPlaceholder } from "@/components/workspace/shell-page";

export default function Page() {
  return (
    <ShellPage>
      <ShellPlaceholder
        title="Задачи"
        description="Скоро здесь появится полный список задач с фильтрами и бэклогом."
      />
    </ShellPage>
  );
}
