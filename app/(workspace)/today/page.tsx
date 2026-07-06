import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { getTaskFormOptions, getTodayTasks } from "@/lib/data/tasks";

export default async function TodayPage() {
  const [tasks, taskOptions] = await Promise.all([
    getTodayTasks(),
    getTaskFormOptions(),
  ]);

  return <FocusWorkspace tasks={tasks} taskOptions={taskOptions} />;
}
