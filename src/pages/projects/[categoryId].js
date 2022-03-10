import { getProjectCategories, getProjectsByCategoryId } from "../../api";
import CategoryTag from "../../components/category-tag";
import Head from "../../components/head";
import Project from "../../components/project";

function ProjectsPage({ projectCategories, projects }) {
  return (
    <div>
      <Head subtitle="Projects" />
      <div className="tags">
        {projectCategories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            href={{
              pathname: "/projects/[categoryId]",
              query: { categoryId: category.id },
            }}
          />
        ))}
      </div>
      <div>
        {projects.map((project) => (
          <Project key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const { projectCategories } = await getProjectCategories();
  const { projects } = await getProjectsByCategoryId(params.categoryId);
  return {
    props: { projectCategories, projects },
  };
}

export async function getStaticPaths() {
  const { projectCategories } = await getProjectCategories();
  return {
    paths: projectCategories.map(({ id: categoryId }) => ({ params: { categoryId } })),
    fallback: false,
  };
}

export default ProjectsPage;
