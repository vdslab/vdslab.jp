import { useEffect } from "react";
import { useRouter } from "next/router";

function ProductListPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/products/list/1");
  });
  return <div></div>;
}

export default ProductListPage;
