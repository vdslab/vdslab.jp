import { getProductCategories, getProductsByCategoryId } from "../../api";
import CategoryTag from "../../components/category-tag";
import Head from "../../components/head";
import Product from "../../components/product";

function ProductsPage({ productCategories, products }) {
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
              pathname: "/products/[categoryId]",
              query: { categoryId: category.id },
            }}
          />
        ))}
      </div>
      <div>
        {products.map((product) => (
          <Product key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const { productCategories } = await getProductCategories();
  const { products } = await getProductsByCategoryId(params.categoryId);
  return {
    props: { productCategories, products },
  };
}

export async function getStaticPaths() {
  const { productCategories } = await getProductCategories();
  return {
    paths: productCategories.map(({ id: categoryId }) => ({
      params: { categoryId },
    })),
    fallback: false,
  };
}

export default ProductsPage;
