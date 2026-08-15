import React from "react";
import Link from "next/link";

const CategoryTag = ({ category, href, large }) => {
  const className = large ? "tag is-link is-medium" : "tag is-link";
  return (
    <Link href={href} className={className}>
      {category.name}
    </Link>
  );
};

export default CategoryTag;
