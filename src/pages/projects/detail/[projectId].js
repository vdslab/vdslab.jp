import { getProject } from "../../../api";
import Head from "../../../components/head";
import Project from "../../../components/project";

function ProjectPage({ project }) {
  return (
    <div>
      <Head subtitle={project.name} />
      <Project project={project} />
    </div>
  );
}

export async function getStaticProps({ params }) {
  const { projectId } = params;
  const { project } = await getProject(projectId);
  return {
    props: { project },
    revalidate: 3600,
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export default ProjectPage;
