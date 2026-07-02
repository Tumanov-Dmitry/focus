import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { requireUser } from "@/lib/auth/require-user";
import { hasSupabasePublicEnv } from "@/lib/config/env";
import { getTaskFormOptions, getTodayTasks } from "@/lib/data/tasks";

export default async function TodayPage() {
  const [tasks, taskOptions] = await Promise.all([
    getTodayTasks(),
    getTaskFormOptions(),
  ]);

  // In configured mode the middleware guarantees a session; surface the email
  // for the profile menu. In mock mode there is no user.
  let userEmail: string | undefined;
  if (hasSupabasePublicEnv()) {
    const auth = await requireUser();
    if (auth.ok) {
      userEmail = auth.user.email ?? undefined;
    }
  }

  return (
    <FocusWorkspace
      tasks={tasks}
      taskOptions={taskOptions}
      userEmail={userEmail}
    />
  );
}
