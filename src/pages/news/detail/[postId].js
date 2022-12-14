import { getPost } from "../../../api";
import Head from "../../../components/head";
import NewsArticle from "../../../components/news-article";

function NewsPage({ post }) {
  return (
    <div>
      <Head subtitle={post.title} />
      <NewsArticle item={post} />
    </div>
  );
}

export async function getStaticProps({ params }) {
  const { postId } = params;
  const { post } = await getPost(postId);
  return {
    props: { post },
    revalidate: 3600,
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export default NewsPage;
