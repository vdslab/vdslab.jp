import { toHTML } from "../markdown";
import CategoryTag from "./category-tag";

function Project({ project }) {
  return (
    <article className="media">
      <div className="columns">
        <div className="column">
          <h3 className="title">{project.name}</h3>
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
              <img src={project.picture.url} />
            </figure>
          </div>
        )}
      </div>
    </article>
  );
}

export default Project;
