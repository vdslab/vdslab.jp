import crypto from "crypto";
import { executeQuery, withTransaction } from "../../db/pool";
import {
  listProductsShape,
  getProductShape,
  createProductShape,
  updateProductShape,
  deleteProductShape,
} from "../schemas";
import { resolvePictureInput, toolSuccess, toolError } from "./utils";

const PRODUCT_REVALIDATION_TARGETS = [
  "/",
  "/products/list",
  { path: "/products/list/[page]", type: "page" },
  { path: "/products/[categoryId]/[page]", type: "page" },
];

const SELECT_PRODUCT_SQL = `
  SELECT 
    p.id, 
    p.name, 
    p.description, 
    p.publish_year AS "publishYear",
    CASE 
      WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
      ELSE NULL
    END AS picture,
    COALESCE(
      json_agg(
        json_build_object('id', c.id, 'name', c.name)
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::json
    ) AS categories
  FROM products p
  LEFT JOIN product_categories pc ON p.id = pc.product_id
  LEFT JOIN categories c ON pc.category_id = c.id
`;

/**
 * Registers Product management tools.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerProductTools(server, options = {}) {
  // list_products
  server.tool(
    "list_products",
    "List lab products with pagination and optional category filter.",
    listProductsShape,
    async ({ page = 1, perPage = 10, categoryId }) => {
      try {
        const limit = perPage;
        const offset = (page - 1) * perPage;

        let productsQuery;
        let countQuery;
        let queryParams;

        if (categoryId) {
          productsQuery = `
            ${SELECT_PRODUCT_SQL}
            WHERE p.id IN (
              SELECT product_id FROM product_categories WHERE category_id = $3
            )
            GROUP BY p.id
            ORDER BY p.publish_year DESC, p.id ASC
            LIMIT $1 OFFSET $2
          `;
          countQuery =
            "SELECT COUNT(*)::int AS count FROM product_categories WHERE category_id = $1";
          queryParams = [limit, offset, categoryId];
        } else {
          productsQuery = `
            ${SELECT_PRODUCT_SQL}
            GROUP BY p.id
            ORDER BY p.publish_year DESC, p.id ASC
            LIMIT $1 OFFSET $2
          `;
          countQuery = "SELECT COUNT(*)::int AS count FROM products";
          queryParams = [limit, offset];
        }

        const [rows, countRes] = await Promise.all([
          executeQuery(productsQuery, queryParams),
          executeQuery(countQuery, categoryId ? [categoryId] : []),
        ]);

        const totalCount = countRes[0]?.count ?? 0;
        return toolSuccess({
          products: rows,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
        });
      } catch (error) {
        return toolError("list_products", error);
      }
    }
  );

  // get_product
  server.tool(
    "get_product",
    "Get a single product by ID.",
    getProductShape,
    async ({ id }) => {
      try {
        const rows = await executeQuery(
          `${SELECT_PRODUCT_SQL} WHERE p.id = $1 GROUP BY p.id LIMIT 1`,
          [id]
        );
        if (rows.length === 0) {
          return toolError("get_product", new Error(`Product '${id}' not found.`));
        }
        return toolSuccess({ product: rows[0] });
      } catch (error) {
        return toolError("get_product", error);
      }
    }
  );

  // create_product
  server.tool(
    "create_product",
    "Create a new product.",
    createProductShape,
    async ({
      name,
      publishYear,
      description = null,
      categoryIds = [],
      imageId,
      picture,
      id,
    }) => {
      try {
        const productId = id ? id.trim() : crypto.randomUUID();
        const pic = await resolvePictureInput({ imageId, picture });

        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO products (
              id, name, description, publish_year,
              picture_url, picture_width, picture_height
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              productId,
              name,
              description ?? null,
              publishYear,
              pic?.picture_url ?? null,
              pic?.picture_width ?? null,
              pic?.picture_height ?? null,
            ]
          );

          if (categoryIds && categoryIds.length > 0) {
            for (const catId of categoryIds) {
              await client.query(
                `INSERT INTO product_categories (product_id, category_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [productId, catId]
              );
            }
          }
        });

        const created = await executeQuery(
          `${SELECT_PRODUCT_SQL} WHERE p.id = $1 GROUP BY p.id`,
          [productId]
        );

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PRODUCT_REVALIDATION_TARGETS,
            `/products/detail/${productId}`,
            { path: "/products/detail/[productId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, product: created[0] });
      } catch (error) {
        return toolError("create_product", error);
      }
    }
  );

  // update_product
  server.tool(
    "update_product",
    "Update an existing product (fields and/or category associations).",
    updateProductShape,
    async ({
      id,
      name,
      publishYear,
      description,
      categoryIds,
      imageId,
      picture,
    }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM products WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("update_product", new Error(`Product '${id}' not found.`));
        }

        await withTransaction(async (client) => {
          const updates = [];
          const values = [id];
          let idx = 2;

          if (name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(name);
          }
          if (publishYear !== undefined) {
            updates.push(`publish_year = $${idx++}`);
            values.push(publishYear);
          }
          if (description !== undefined) {
            updates.push(`description = $${idx++}`);
            values.push(description);
          }

          if (imageId !== undefined || picture !== undefined) {
            const pic = await resolvePictureInput({ imageId, picture });
            updates.push(`picture_url = $${idx++}`);
            values.push(pic ? pic.picture_url : null);
            updates.push(`picture_width = $${idx++}`);
            values.push(pic ? pic.picture_width : null);
            updates.push(`picture_height = $${idx++}`);
            values.push(pic ? pic.picture_height : null);
          }

          if (updates.length > 0) {
            await client.query(
              `UPDATE products SET ${updates.join(", ")} WHERE id = $1`,
              values
            );
          }

          if (categoryIds !== undefined) {
            await client.query(
              "DELETE FROM product_categories WHERE product_id = $1",
              [id]
            );
            for (const catId of categoryIds) {
              await client.query(
                `INSERT INTO product_categories (product_id, category_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [id, catId]
              );
            }
          }
        });

        const updated = await executeQuery(
          `${SELECT_PRODUCT_SQL} WHERE p.id = $1 GROUP BY p.id`,
          [id]
        );

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PRODUCT_REVALIDATION_TARGETS,
            `/products/detail/${id}`,
            { path: "/products/detail/[productId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, product: updated[0] });
      } catch (error) {
        return toolError("update_product", error);
      }
    }
  );

  // delete_product
  server.tool(
    "delete_product",
    "Delete a product by ID.",
    deleteProductShape,
    async ({ id }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM products WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("delete_product", new Error(`Product '${id}' not found.`));
        }

        await executeQuery("DELETE FROM products WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PRODUCT_REVALIDATION_TARGETS,
            `/products/detail/${id}`,
            { path: "/products/detail/[productId]", type: "page" },
          ]);
        }

        return toolSuccess({
          success: true,
          message: `Product '${id}' deleted successfully.`,
        });
      } catch (error) {
        return toolError("delete_product", error);
      }
    }
  );
}
