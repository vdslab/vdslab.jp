import { useEffect } from "react";
import { useRouter } from "next/router";

function NewsListPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/news/list/1");
  });
  return <div></div>;
}

export default NewsListPage;
