import { getPost, getPostIds } from "../../../api";
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
  };
}

export async function getStaticPaths() {
  const { posts } = await getPostIds();
  return {
    paths: posts.map(({ id: postId }) => ({ params: { postId } })),
    fallback: false,
  };
}

export default NewsPage;
