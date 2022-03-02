import { getProduct, getProductIds } from "../../../api";
import Head from "../../../components/head";
import Product from "../../../components/product";

function ProductPage({ product }) {
  return (
    <div>
      <Head subtitle={product.name} />
      <Product product={product} />
    </div>
  );
}

export async function getStaticProps({ params }) {
  const { productId } = params;
  const { product } = await getProduct(productId);
  return {
    props: { product },
  };
}

export async function getStaticPaths() {
  const { products } = await getProductIds();
  return {
    paths: products.map(({ id: productId }) => ({ params: { productId } })),
    fallback: false,
  };
}

export default ProductPage;
