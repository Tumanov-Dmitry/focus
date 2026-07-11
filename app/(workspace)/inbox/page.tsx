import { TasksView } from "@/components/tasks/tasks-view";
import { getAllTasks, getTaskFormOptions } from "@/lib/data/tasks";

export default async function TasksPage() {
  const [tasks, taskOptions] = await Promise.all([
    getAllTasks(),
    getTaskFormOptions(),
  ]);

  return <TasksView tasks={tasks} taskOptions={taskOptions} />;
}
