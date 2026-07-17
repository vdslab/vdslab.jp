import { getProject } from "../../../../api";
import Project from "../../../../components/project";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { projectId } = params;
  const { project } = await getProject(projectId);
  return {
    title: project ? project.name : "Projects",
    openGraph: {
      url: `/projects/detail/${projectId}`,
    },
  };
}

export default async function ProjectPage({ params }) {
  const { projectId } = params;
  const { project } = await getProject(projectId);

  return (
    <div>
      <Project project={project} />
    </div>
  );
}
