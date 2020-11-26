import { getCategories, getProjects, getProjectsByCategoryId } from "../../api";
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

export async function getStaticProps({ params }) {
  const { categories } = await getCategories();
  const { projects } = await getProjectsByCategoryId(params.categoryId);
  return {
    props: { categories, projects },
  };
}

export async function getStaticPaths() {
  const { categories } = await getCategories();
  return {
    paths: categories.map(({ id: categoryId }) => ({ params: { categoryId } })),
    fallback: false,
  };
}

export default ProjectsPage;
