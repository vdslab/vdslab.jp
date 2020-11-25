import React from "react";
import { Link } from "react-router-dom";
import { toHTML } from "../markdown";

const formatDate = (date) => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const NewsArticle = ({ item }) => {
  return (
    <article className="media">
      <div className="media-content">
        <h4 className="title">
          <Link to={`/news/${item.id}`}>
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
};

export default NewsArticle;
