import Link from "next/link";
import { getProjects, getProjectCategories } from "../../../api";
import CategoryTag from "../../../components/category-tag";
import Head from "../../../components/head";
import Project from "../../../components/project";

const perPage = 5;

function ProjectsListPage({ maxPage, page, projectCategories, projects }) {
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
              pathname: "/projects/[categoryId]/[page]",
              query: { categoryId: category.id, page: 1 },
            }}
          />
        ))}
      </div>
      <div>
        {projects.map((project) => (
          <Project key={project.id} project={project} />
        ))}
      </div>
      <div className="field">
        <nav className="pagination is-centerd">
          <Link
            href={{
              pathname: "/projects/list/[page]",
              query: { page: page - 1 },
            }}
            className="pagination-previous"
            style={{
              pointerEvents: page <= 1 ? "none" : "auto",
            }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={{
              pathname: "/projects/list/[page]",
              query: { page: page + 1 },
            }}
            className="pagination-next"
            style={{
              pointerEvents: page >= maxPage ? "none" : "auto",
            }}
            disabled={page === maxPage}
          >
            次へ
          </Link>
        </nav>
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const page = +(params?.page || 1);
  const { projectCategories } = await getProjectCategories();
  const { projects, count } = await getProjects(page, perPage);
  const maxPage = Math.ceil(count.aggregate.count / perPage);
  return {
    props: { maxPage, page, projects, projectCategories },
    revalidate: 3600,
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export default ProjectsListPage;
