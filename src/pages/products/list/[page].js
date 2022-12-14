import Link from "next/link";
import { getProducts, getProductCategories } from "../../../api";
import CategoryTag from "../../../components/category-tag";
import Head from "../../../components/head";
import Product from "../../../components/product";

const perPage = 5;

function ProductsListPage({ maxPage, page, products, productCategories }) {
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
              pathname: "/products/list/[page]",
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
              pathname: "/products/list/[page]",
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
  const { productCategories } = await getProductCategories();
  const { products, count } = await getProducts(page, perPage);
  const maxPage = Math.ceil(count.aggregate.count / perPage);
  return {
    props: { maxPage, page, products, productCategories },
    revalidate: 3600,
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export default ProductsListPage;
