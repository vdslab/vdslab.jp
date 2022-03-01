import Image from "next/image";
import { toHTML } from "../markdown";
import CategoryTag from "./category-tag";
import Link from "next/link";

function Project({ project }) {
  return (
    <article className="media">
      <div className="columns">
        <div className="column">
          <h3 className="title">
            <Link href={`/projects/detail/${project.id}`}>
              <a className="has-text-black">{project.name}</a>
            </Link>
          </h3>
          <div className="tags">
            {project.categories.map((category) => (
              <CategoryTag
                key={category.id}
                category={category}
                href={{
                  pathname: "/projects/[categoryId]",
                  query: { categoryId: category.id },
                }}
              />
            ))}
          </div>
          <div
            className="content"
            dangerouslySetInnerHTML={{
              __html: toHTML(project.description),
            }}
          />
        </div>
        {project.picture && (
          <div className="column">
            <figure className="image">
              <Image
                src={project.picture.url}
                width={project.picture.width}
                height={project.picture.height}
                alt={project.name}
              />
            </figure>
          </div>
        )}
      </div>
    </article>
  );
}

export default Project;
