import { toHTML } from "../markdown";
import CategoryTag from "./category-tag";
import Link from "next/link";

function Product({ product }) {
  return (
    <article className="media">
      <div className="columns">
        <div className="column">
          <h3 className="title">
            <Link href={`/products/detail/${product.id}`}>
              <a className="has-text-black">{product.name}</a>
            </Link>
          </h3>
          <div className="tags">
            {product.categories.map((category) => (
              <CategoryTag
                key={category.id}
                category={category}
                href={{
                  pathname: "/products/[categoryId]",
                  query: { categoryId: category.id },
                }}
              />
            ))}
          </div>
          <div
            className="content"
            dangerouslySetInnerHTML={{
              __html: toHTML(product.description),
            }}
          />
        </div>
        {product.picture && (
          <div className="column">
            <figure className="image">
              <img src={product.picture.url} />
            </figure>
          </div>
        )}
      </div>
    </article>
  );
}

export default Product;
