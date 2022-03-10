import Link from "next/link";
import { getProjects, getProjectCount, getProjectCategories } from "../../../api";
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
      <div className="field">
        <nav className="pagination is-centerd">
          <Link
            href={{
              pathname: "/projects/list/[page]",
              query: { page: page - 1 },
            }}
          >
            <a
              className="pagination-previous"
              style={{
                pointerEvents: page <= 1 ? "none" : "auto",
              }}
              disabled={page === 1}
            >
              前へ
            </a>
          </Link>
          <Link
            href={{
              pathname: "/projects/list/[page]",
              query: { page: page + 1 },
            }}
          >
            <a
              className="pagination-next"
              style={{
                pointerEvents: page >= maxPage ? "none" : "auto",
              }}
              disabled={page === maxPage}
            >
              次へ
            </a>
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
  };
}

export async function getStaticPaths() {
  const paths = [];
  const count = await getProjectCount();
  const maxPage = Math.ceil(count / perPage);
  for (let page = 1; page <= maxPage; ++page) {
    paths.push({ params: { page: page.toString() } });
  }
  return {
    paths,
    fallback: false,
  };
}

export default ProjectsListPage;
