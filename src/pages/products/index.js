import { getCategories, getProducts } from "../../api";
import CategoryTag from "../../components/category-tag";
import Head from "../../components/head";
import Product from "../../components/product";

function ProductsPage({ categories, products }) {
  return (
    <div>
      <Head subtitle="Products" />
      <div className="tags">
        {categories.map((category) => (
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

export async function getStaticProps() {
  const { categories } = await getCategories();
  const { products } = await getProducts();
  return {
    props: { categories, products },
  };
}

export default ProductsPage;
