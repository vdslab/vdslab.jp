import Link from "next/link";
import { getProjectCategories, getProjectsByCategoryId, getProjectCountByCategoryId } from "../../../api";
import CategoryTag from "../../../components/category-tag";
import Head from "../../../components/head";
import Project from "../../../components/project";

const perPage = 5;

function ProjectsPage({
  maxPage,
  page,
  projectCategories,
  projects,
  categoryId
}) {
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
              pathname: "/projects/[categoryId]/[page]",
              query: { categoryId: categoryId, page: page - 1 },
            }}
          >
            <a
              className="pagination-previous"
              style={{ pointerEvents: page <= 1 ? "none" : "auto" }}
              disabled={page === 1}
            >
              前へ
            </a>
          </Link>
          <Link
            href={{
              pathname: "/projects/[categoryId]/[page]",
              query: { categoryId: categoryId, page: page + 1 },
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
  const { categoryId } = params;
  const { projectCategories } = await getProjectCategories();
  const { projects, count } = await getProjectsByCategoryId(page, perPage, categoryId);
  const maxPage = Math.ceil(count.aggregate.count / perPage);
  return {
    props: { maxPage, page, projectCategories, projects, categoryId },
  };
}

export async function getStaticPaths() {
  const { projectCategories } = await getProjectCategories();
  const paths = [];
  for (const category of projectCategories) {
    const count = await getProjectCountByCategoryId(category.id);
    const maxPage = Math.ceil(count / perPage);
    for (let page = 1; page <= maxPage; ++page)
      paths.push({
        params: { categoryId: category.id, page: page.toString() },
      });
  }
  return {
    paths,
    fallback: false,
  };
}

export default ProjectsPage;
