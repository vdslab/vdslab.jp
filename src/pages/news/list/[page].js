import Link from "next/link";
import { useRouter } from "next/router";

import { getPostCount, getPosts } from "../../../api";
import Head from "../../../components/head";
import NewsArticle from "../../../components/news-article";

const perPage = 5;

function NewsListPage({ maxPage, page, posts }) {
  return (
    <div>
      <Head subtitle="News" />
      <h2 className="title">News</h2>
      <div className="field">
        {posts.map((item) => {
          return <NewsArticle key={item.id} item={item} />;
        })}
      </div>
      <div className="field">
        <nav className="pagination is-centered">
          <Link
            href={{ pathname: "/news/list/[page]", query: { page: page - 1 } }}
            className="pagination-previous"
            style={{
              pointerEvents: page <= 1 ? "none" : "auto",
            }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={{ pathname: "/news/list/[page]", query: { page: page + 1 } }}
            className="pagination-next"
            style={{
              pointerEvents: page >= maxPage ? "none" : "auto",
            }}
            disabled={page === maxPage}
          >
            次へ
          </Link>
        </nav>
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const page = +(params?.page || 1);
  const { posts, count } = await getPosts(page, perPage);
  const maxPage = Math.ceil(count.aggregate.count / perPage);
  return {
    props: { maxPage, page, posts },
  };
}

export async function getStaticPaths() {
  const paths = [];
  const count = await getPostCount();
  const maxPage = Math.ceil(count / perPage);
  for (let page = 1; page <= maxPage; ++page) {
    paths.push({ params: { page: page.toString() } });
  }
  return {
    paths,
    fallback: false,
  };
}

export default NewsListPage;
