import React from "react";
import Link from "next/link";

const CategoryTag = ({ category, href, large }) => {
  const className = large ? "tag is-link is-medium" : "tag is-link";
  return (
    <Link href={href}>
      <a className={className} style={{ backgroundColor: "rgb(47, 87, 89)" }}>
        {category.name}
      </a>
    </Link>
  );
};

export default CategoryTag;
