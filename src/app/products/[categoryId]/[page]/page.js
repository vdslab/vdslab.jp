import Link from "next/link";
import { getProductCategories, getProductsByCategoryId } from "../../../../api";
import CategoryTag from "../../../../components/category-tag";
import Product from "../../../../components/product";

const perPage = 5;

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata() {
  return {
    title: "Products",
  };
}

export default async function ProductsCategoryListPage({ params }) {
  const page = +(params?.page || 1);
  const { categoryId } = params;
  const { products, count } = await getProductsByCategoryId(
    page,
    perPage,
    categoryId
  );
  const { productCategories } = await getProductCategories();
  const maxPage = Math.ceil(count.aggregate.count / perPage);

  return (
    <div>
      <div className="tags">
        {productCategories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            href={`/products/${category.id}/1`}
          />
        ))}
      </div>
      <div>
        {products.map((product) => (
          <Product key={product.id} product={product} />
        ))}
      </div>
      <div className="field">
        <nav className="pagination is-centerd">
          <Link
            href={`/products/${categoryId}/${page - 1}`}
            className="pagination-previous"
            style={{ pointerEvents: page <= 1 ? "none" : "auto" }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={`/products/${categoryId}/${page + 1}`}
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
