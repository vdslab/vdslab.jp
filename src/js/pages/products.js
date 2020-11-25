import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toHTML } from "../markdown";
import { Head } from "../head";
import CategoryTag from "../components/category-tag";
import { getCategories, getProducts, getProductsByCategoryId } from "../api";

const Product = ({ product }) => (
  <article className="media">
    <div className="columns">
      <div className="column">
        <h3 className="title">{product.name}</h3>
        <div className="tags">
          {product.categories.map((category) => (
            <CategoryTag
              key={category.id}
              category={category}
              to={`/products?category=${category.id}`}
            />
          ))}
        </div>
        <div
          className="content"
          dangerouslySetInnerHTML={{
            __html: toHTML(product.description),
          }}
        />
      </div>
      {product.picture && (
        <div className="column">
          <figure className="image">
            <img src={product.picture.url} />
          </figure>
        </div>
      )}
    </div>
  </article>
);

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const category = params.get("category");

  useEffect(() => {
    getCategories().then(({ categories }) => {
      setCategories(categories);
    });
  }, []);

  useEffect(() => {
    const promise = category
      ? getProductsByCategoryId(category)
      : getProducts();
    promise.then(({ products }) => {
      setProducts(products);
    });
  }, [category]);

  return (
    <div>
      <Head subtitle="Products" />
      <div className="tags">
        {categories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            to={`/products?category=${category.id}`}
          />
        ))}
      </div>
      <div>
        {products.map((product) => (
          <Product key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Products;
