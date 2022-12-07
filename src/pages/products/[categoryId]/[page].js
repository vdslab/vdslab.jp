import Link from "next/link";
import {
  getProductCategories,
  getProductsByCategoryId,
  getProductCountByCategoryId,
} from "../../../api";
import CategoryTag from "../../../components/category-tag";
import Head from "../../../components/head";
import Product from "../../../components/product";

const perPage = 5;

function ProductsPage({
  maxPage,
  page,
  products,
  productCategories,
  categoryId,
}) {
  return (
    <div>
      <Head subtitle="Products" />
      <div className="tags">
        {productCategories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            href={{
              pathname: "/products/[categoryId]/[page]",
              query: { categoryId: category.id, page: 1 },
            }}
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
            href={{
              pathname: "/products/[categoryId]/[page]",
              query: { categoryId: categoryId, page: page - 1 },
            }}
            className="pagination-previous"
            style={{ pointerEvents: page <= 1 ? "none" : "auto" }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={{
              pathname: "/products/[categoryId]/[page]",
              query: { categoryId: categoryId, page: page + 1 },
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
  const { categoryId } = params;
  const { products, count } = await getProductsByCategoryId(
    page,
    perPage,
    categoryId
  );
  const { productCategories } = await getProductCategories();
  const maxPage = Math.ceil(count.aggregate.count / perPage);
  return {
    props: { maxPage, page, products, productCategories, categoryId },
  };
}

export async function getStaticPaths() {
  const { productCategories } = await getProductCategories();
  const paths = [];
  for (const category of productCategories) {
    const count = await getProductCountByCategoryId(category.id);
    const maxPage = Math.ceil(count / perPage);
    for (let page = 1; page <= maxPage; ++page) {
      paths.push({
        params: { categoryId: category.id, page: page.toString() },
      });
    }
  }
  return {
    paths,
    fallback: false,
  };
}

export default ProductsPage;
