import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toHTML } from "../markdown";
import { Head } from "../head";
import { getPost } from "../api";
import NewsArticle from "../components/news-article";

const NewsDetail = () => {
  const params = useParams();

  const [post, setPost] = useState(null);
  useEffect(() => {
    getPost(params.postId).then(({ post }) => {
      setPost(post);
    });
  }, [params.postId]);

  if (post == null) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <Head subtitle={post.title} />
      <NewsArticle item={post} />
    </div>
  );
};

export default NewsDetail;
