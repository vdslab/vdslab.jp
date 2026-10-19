import crypto from "crypto";
import { executeQuery } from "../../db/pool.js";
import {
  listNewsShape,
  getNewsShape,
  createNewsShape,
  updateNewsShape,
  deleteNewsShape,
} from "../schemas.js";
import { toolSuccess, toolError } from "./utils.js";

const NEWS_REVALIDATION_TARGETS = [
  "/",
  "/news/list",
  { path: "/news/list/[page]", type: "page" },
];

/**
 * Registers News management tools.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerNewsTools(server, options = {}) {
  // list_news
  server.tool(
    "list_news",
    "List news articles with pagination.",
    listNewsShape,
    async ({ page = 1, perPage = 10 }) => {
      try {
        const limit = perPage;
        const offset = (page - 1) * perPage;

        const [rows, countRes] = await Promise.all([
          executeQuery(
            `SELECT id, title, content, date::text AS date
             FROM posts
             ORDER BY date DESC, id DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
          ),
          executeQuery("SELECT COUNT(*)::int AS count FROM posts"),
        ]);

        const totalCount = countRes[0]?.count ?? 0;
        return toolSuccess({
          news: rows,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
        });
      } catch (error) {
        return toolError("list_news", error);
      }
    }
  );

  // get_news
  server.tool(
    "get_news",
    "Get a single news article by ID.",
    getNewsShape,
    async ({ id }) => {
      try {
        const rows = await executeQuery(
          "SELECT id, title, content, date::text AS date FROM posts WHERE id = $1 LIMIT 1",
          [id]
        );
        if (rows.length === 0) {
          return toolError("get_news", new Error(`News post '${id}' not found.`));
        }
        return toolSuccess({ post: rows[0] });
      } catch (error) {
        return toolError("get_news", error);
      }
    }
  );

  // create_news
  server.tool(
    "create_news",
    "Create a new news article.",
    createNewsShape,
    async ({ title, content, date, id }) => {
      try {
        const postId =
          id && id.trim() ? id.trim() : crypto.randomUUID();
        const rows = await executeQuery(
          `INSERT INTO posts (id, title, content, date)
           VALUES ($1, $2, $3, $4::date)
           RETURNING id, title, content, date::text AS date`,
          [postId, title, content, date]
        );

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...NEWS_REVALIDATION_TARGETS,
            `/news/detail/${postId}`,
            { path: "/news/detail/[postId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, post: rows[0] });
      } catch (error) {
        return toolError("create_news", error);
      }
    }
  );

  // update_news
  server.tool(
    "update_news",
    "Update an existing news article (partially or fully).",
    updateNewsShape,
    async ({ id, title, content, date }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM posts WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("update_news", new Error(`News post '${id}' not found.`));
        }

        const updates = [];
        const values = [id];
        let idx = 2;

        if (title !== undefined) {
          updates.push(`title = $${idx++}`);
          values.push(title);
        }
        if (content !== undefined) {
          updates.push(`content = $${idx++}`);
          values.push(content);
        }
        if (date !== undefined) {
          updates.push(`date = $${idx++}::date`);
          values.push(date);
        }

        let updatedPost;
        if (updates.length > 0) {
          const rows = await executeQuery(
            `UPDATE posts SET ${updates.join(", ")} WHERE id = $1
             RETURNING id, title, content, date::text AS date`,
            values
          );
          updatedPost = rows[0];
        } else {
          const rows = await executeQuery(
            "SELECT id, title, content, date::text AS date FROM posts WHERE id = $1",
            [id]
          );
          updatedPost = rows[0];
        }

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...NEWS_REVALIDATION_TARGETS,
            `/news/detail/${id}`,
            { path: "/news/detail/[postId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, post: updatedPost });
      } catch (error) {
        return toolError("update_news", error);
      }
    }
  );

  // delete_news
  server.tool(
    "delete_news",
    "Delete a news article by ID.",
    deleteNewsShape,
    async ({ id }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM posts WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("delete_news", new Error(`News post '${id}' not found.`));
        }

        await executeQuery("DELETE FROM posts WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...NEWS_REVALIDATION_TARGETS,
            `/news/detail/${id}`,
            { path: "/news/detail/[postId]", type: "page" },
          ]);
        }

        return toolSuccess({
          success: true,
          message: `News post '${id}' deleted successfully.`,
        });
      } catch (error) {
        return toolError("delete_news", error);
      }
    }
  );
}
