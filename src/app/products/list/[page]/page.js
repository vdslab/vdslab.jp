export const dynamic = "force-dynamic";
import Link from "next/link";
import { getProducts, getProductCategories } from "../../../../api";
import CategoryTag from "../../../../components/category-tag";
import Product from "../../../../components/product";

const perPage = 5;

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const page = params?.page || "1";
  return {
    title: "Products - vdslab",
    openGraph: {
      title: "Products - vdslab",
      url: `https://vdslab.jp/products/list/${page}`,
      images: [{ url: "/images/media.png" }],
      siteName: "vdslab",
      type: "website",
    },
    twitter: {
      title: "Products - vdslab",
    }
  };
}

export default async function ProductsListPage({ params }) {
  const page = +(params?.page || 1);
  const { productCategories } = await getProductCategories();
  const { products, count } = await getProducts(page, perPage);
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
        <nav className="pagination is-centered">
          <Link
            href={`/products/list/${page - 1}`}
            className={`pagination-previous ${page <= 1 ? "is-disabled" : ""}`}
            aria-disabled={page <= 1}
            disabled={page <= 1}
          >
            前へ
          </Link>
          <Link
            href={`/products/list/${page + 1}`}
            className={`pagination-next ${page >= maxPage ? "is-disabled" : ""}`}
            aria-disabled={page >= maxPage}
            disabled={page >= maxPage}
          >
            次へ
          </Link>
        </nav>
      </div>
    </div>
  );
}
