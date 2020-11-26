import { getCategories, getProjects } from "../../api";
import CategoryTag from "../../components/category-tag";
import Head from "../../components/head";
import Project from "../../components/project";

function ProjectsPage({ categories, projects }) {
  return (
    <div>
      <Head subtitle="Projects" />
      <div className="tags">
        {categories.map((category) => (
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

export async function getStaticProps() {
  const { categories } = await getCategories();
  const { projects } = await getProjects();
  return {
    props: { categories, projects },
  };
}

export default ProjectsPage;
