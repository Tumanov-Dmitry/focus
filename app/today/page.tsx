import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { getTodayTasks } from "@/lib/data/tasks";

export default async function TodayPage() {
  const tasks = await getTodayTasks();

  return <FocusWorkspace tasks={tasks} />;
}
