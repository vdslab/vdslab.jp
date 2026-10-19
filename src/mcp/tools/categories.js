import crypto from "crypto";
import { executeQuery } from "../../db/pool";
import {
  listCategoriesShape,
  createCategoryShape,
  updateCategoryShape,
  deleteCategoryShape,
} from "../schemas";
import { toolSuccess, toolError } from "./utils";

const CATEGORY_REVALIDATION_TARGETS = [
  "/",
  "/projects/list",
  { path: "/projects/list/[page]", type: "page" },
  { path: "/projects/[categoryId]/[page]", type: "page" },
  "/products/list",
  { path: "/products/list/[page]", type: "page" },
  { path: "/products/[categoryId]/[page]", type: "page" },
];

/**
 * Registers Category management tools.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerCategoryTools(server, options = {}) {
  // list_categories
  server.tool(
    "list_categories",
    "List all categories with associated project and product counts.",
    listCategoriesShape,
    async () => {
      try {
        const rows = await executeQuery(`
          SELECT 
            c.id, 
            c.name,
            COUNT(DISTINCT pc.project_id)::int AS "projectCount",
            COUNT(DISTINCT prc.product_id)::int AS "productCount"
          FROM categories c
          LEFT JOIN project_categories pc ON c.id = pc.category_id
          LEFT JOIN product_categories prc ON c.id = prc.category_id
          GROUP BY c.id, c.name
          ORDER BY c.name ASC
        `);
        return toolSuccess({ categories: rows, count: rows.length });
      } catch (error) {
        return toolError("list_categories", error);
      }
    }
  );

  // create_category
  server.tool(
    "create_category",
    "Create a new category.",
    createCategoryShape,
    async ({ name, id }) => {
      try {
        const categoryId = id ? id.trim() : crypto.randomUUID();
        const rows = await executeQuery(
          `INSERT INTO categories (id, name)
           VALUES ($1, $2)
           RETURNING id, name`,
          [categoryId, name.trim()]
        );

        if (options.onRevalidate) {
          await options.onRevalidate(CATEGORY_REVALIDATION_TARGETS);
        }

        return toolSuccess({ success: true, category: rows[0] });
      } catch (error) {
        return toolError("create_category", error);
      }
    }
  );

  // update_category
  server.tool(
    "update_category",
    "Update a category name.",
    updateCategoryShape,
    async ({ id, name }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM categories WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("update_category", new Error(`Category '${id}' not found.`));
        }

        const rows = await executeQuery(
          `UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name`,
          [id, name.trim()]
        );

        if (options.onRevalidate) {
          await options.onRevalidate(CATEGORY_REVALIDATION_TARGETS);
        }

        return toolSuccess({ success: true, category: rows[0] });
      } catch (error) {
        return toolError("update_category", error);
      }
    }
  );

  // delete_category
  server.tool(
    "delete_category",
    "Delete a category. If linked to projects or products, fails unless force: true.",
    deleteCategoryShape,
    async ({ id, force = false }) => {
      try {
        const existing = await executeQuery(
          "SELECT id, name FROM categories WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("delete_category", new Error(`Category '${id}' not found.`));
        }

        if (!force) {
          const [projectCountRes, productCountRes] = await Promise.all([
            executeQuery(
              "SELECT COUNT(*)::int AS count FROM project_categories WHERE category_id = $1",
              [id]
            ),
            executeQuery(
              "SELECT COUNT(*)::int AS count FROM product_categories WHERE category_id = $1",
              [id]
            ),
          ]);

          const projectCount = projectCountRes[0]?.count ?? 0;
          const productCount = productCountRes[0]?.count ?? 0;

          if (projectCount > 0 || productCount > 0) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Cannot delete category '${id}' (${existing[0].name}): referenced by ${projectCount} project(s) and ${productCount} product(s). Set force: true to delete and remove associations.`,
                },
              ],
            };
          }
        }

        await executeQuery("DELETE FROM categories WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate(CATEGORY_REVALIDATION_TARGETS);
        }

        return toolSuccess({
          success: true,
          message: `Category '${id}' deleted successfully.`,
        });
      } catch (error) {
        return toolError("delete_category", error);
      }
    }
  );
}
