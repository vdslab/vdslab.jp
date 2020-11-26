import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function NewsListPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/news/list/1");
  });
  return <div></div>;
}

export default NewsListPage;
