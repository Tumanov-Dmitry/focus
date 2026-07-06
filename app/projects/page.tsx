import { ProjectsView } from "@/components/projects/projects-view";
import { requireUser } from "@/lib/auth/require-user";
import { hasSupabasePublicEnv } from "@/lib/config/env";
import { getProjects } from "@/lib/data/projects";

export default async function Page() {
  const projects = await getProjects({ includeArchived: true });

  let userEmail: string | undefined;
  if (hasSupabasePublicEnv()) {
    const auth = await requireUser();
    if (auth.ok) {
      userEmail = auth.user.email ?? undefined;
    }
  }

  return <ProjectsView projects={projects} userEmail={userEmail} />;
}
