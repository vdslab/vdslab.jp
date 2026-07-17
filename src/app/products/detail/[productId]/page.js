import { getProduct } from "../../../../api";
import Product from "../../../../components/product";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { productId } = params;
  const { product } = await getProduct(productId);
  return {
    title: product ? product.name : "Products",
    openGraph: {
      url: `/products/detail/${productId}`,
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { productId } = params;
  const { product } = await getProduct(productId);

  return (
    <div>
      <Product product={product} />
    </div>
  );
}
