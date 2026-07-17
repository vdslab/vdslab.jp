import Link from "next/link";
import { getProjectCategories, getProjectsByCategoryId } from "../../../../api";
import CategoryTag from "../../../../components/category-tag";
import Project from "../../../../components/project";

const perPage = 5;

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata() {
  return {
    title: "Projects",
  };
}

export default async function ProjectsPage({ params }) {
  const page = +(params?.page || 1);
  const { categoryId } = params;
  const { projectCategories } = await getProjectCategories();
  const { projects, count } = await getProjectsByCategoryId(
    page,
    perPage,
    categoryId
  );
  const maxPage = Math.ceil(count.aggregate.count / perPage);

  return (
    <div>
      <div className="tags">
        {projectCategories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            href={`/projects/${category.id}/1`}
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
            href={`/projects/${categoryId}/${page - 1}`}
            className="pagination-previous"
            style={{ pointerEvents: page <= 1 ? "none" : "auto" }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={`/projects/${categoryId}/${page + 1}`}
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
