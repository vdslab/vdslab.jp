export const dynamic = "force-dynamic";
import { getPost } from "../../../../api";
import NewsArticle from "../../../../components/news-article";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { postId } = params;
  const { post } = await getPost(postId);
  return {
    title: post ? post.title : "News",
    openGraph: {
      url: `/news/detail/${postId}`,
    },
  };
}

export default async function NewsDetailPage({ params }) {
  const { postId } = params;
  const { post } = await getPost(postId);

  return (
    <div>
      <NewsArticle item={post} />
    </div>
  );
}
