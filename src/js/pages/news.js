import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toHTML } from "../markdown";
import { Head } from "../head";
import { getPosts } from "../api";
import NewsArticle from "../components/news-article";

const clamp = (x, lower, upper) => {
  return Math.min(Math.max(x, lower), upper);
};

const News = ({ match }) => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = +(params.get("page") || 1);
  const perPage = 5;

  const [posts, setPosts] = useState([]);
  const [maxPage, setMaxPage] = useState(1);

  useEffect(() => {
    const subscription = getPosts(page, perPage).subscribe(
      ({ posts, count }) => {
        setPosts(posts);
        setMaxPage(Math.ceil(count.aggregate.count / perPage));
      },
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [page]);
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
            className="pagination-previous"
            style={{
              pointerEvents: page <= 1 ? "none" : "auto",
            }}
            to={`/news?page=${page - 1}`}
            disabled={page === 1}
          >
            前へ
          </Link>
          <Link
            className="pagination-next"
            style={{
              pointerEvents: page >= maxPage ? "none" : "auto",
            }}
            to={`/news?page=${page + 1}`}
            disabled={page === maxPage}
          >
            次へ
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default News;
