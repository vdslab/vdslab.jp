import Link from "next/link";
import { toHTML } from "../markdown";

const formatDate = (date) => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

function NewsArticle({ item }) {
  return (
    <article className="media">
      <div className="media-content">
        <h4 className="title">
          <Link href={`/news/detail/${item.id}`} className="has-text-black">
            {item.title} ({formatDate(new Date(item.date))})
          </Link>
        </h4>
        <div
          className="content"
          dangerouslySetInnerHTML={{
            __html: toHTML(item.content),
          }}
        />
      </div>
    </article>
  );
}

export default NewsArticle;
