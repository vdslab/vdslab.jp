import { getProduct } from "../../../api";
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
    revalidate: 3600,
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export default ProductPage;
