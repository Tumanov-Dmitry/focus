import { ProjectsView } from "@/components/projects/projects-view";
import { getProjects } from "@/lib/data/projects";

export default async function Page() {
  const projects = await getProjects({ includeArchived: true });

  return <ProjectsView projects={projects} />;
}
