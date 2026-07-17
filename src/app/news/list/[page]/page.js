import Link from "next/link";
import { getPosts } from "../../../../api";
import NewsArticle from "../../../../components/news-article";

const perPage = 5;

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const page = params?.page || "1";
  return {
    title: "News",
    openGraph: {
      url: `/news/list/${page}`,
    },
  };
}

export default async function NewsListPage({ params }) {
  const page = +(params?.page || 1);
  const { posts, count } = await getPosts(page, perPage);
  const maxPage = Math.ceil(count.aggregate.count / perPage);

  return (
    <div>
      <h2 className="title">News</h2>
      <div className="field">
        {posts.map((item) => {
          return <NewsArticle key={item.id} item={item} />;
        })}
      </div>
      <div className="field">
        <nav className="pagination is-centered">
          <Link
            href={`/news/list/${page - 1}`}
            className="pagination-previous"
            style={{
              pointerEvents: page <= 1 ? "none" : "auto",
            }}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            href={`/news/list/${page + 1}`}
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
