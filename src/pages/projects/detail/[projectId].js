import { getProject, getProjectIds } from "../../../api";
import Head from "next/dist/next-server/lib/head";
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
	};
}

export async function getStaticPaths() {
	const { projects } = await getProjectIds();
	return {
		paths: projects.map(({ id: projectId }) => ({ params: { projectId } })),
		fallback: false,
	};
}

export default ProjectPage;
