import Image from "next/image";
import { toHTML } from "../markdown";
import CategoryTag from "./category-tag";
import Link from "next/link";

function Product({ product }) {
  return (
    <article className="media">
      <div className="columns">
        <div className="column">
          <h3 className="title">
            <Link
              href={`/products/detail/${product.id}`}
              className="has-text-black"
            >
              {product.name}
            </Link>
          </h3>
          <div className="tags">
            {product.categories.map((category) => (
              <CategoryTag
                key={category.id}
                category={category}
                href={{
                  pathname: "/products/[categoryId]/[page]",
                  query: { categoryId: category.id, page: 1 },
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
              <Image
                src={product.picture.url}
                width={product.picture.width}
                height={product.picture.height}
                alt={product.name}
              />
            </figure>
          </div>
        )}
      </div>
    </article>
  );
}

export default Product;
