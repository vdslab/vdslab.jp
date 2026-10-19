import crypto from "crypto";
import { executeQuery } from "../../db/pool";
import { decodeBase64Image } from "../image-utils";
import {
  uploadImageShape,
  listImagesShape,
  deleteImageShape,
} from "../schemas";

let imagesTableEnsured = false;

/**
 * Ensures the images table exists in PostgreSQL.
 */
export async function ensureImagesTable() {
  if (imagesTableEnsured) return;
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(255) PRIMARY KEY,
        data BYTEA NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        width INT NOT NULL CHECK (width > 0),
        height INT NOT NULL CHECK (height > 0),
        filename VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    imagesTableEnsured = true;
  } catch (err) {
    if (
      err.code === "23505" ||
      err.code === "42P07" ||
      err.message?.includes("pg_type_typname_nsp_index")
    ) {
      imagesTableEnsured = true;
      return;
    }
    throw err;
  }
}

/**
 * Registers image management tools on the McpServer instance.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerImageTools(server, options = {}) {
  // upload_image
  server.tool(
    "upload_image",
    "Upload an image (PNG, JPEG, WebP, GIF up to 4MB) to PostgreSQL and receive its URL and metadata.",
    uploadImageShape,
    async ({ dataBase64, filename }) => {
      try {
        const { buffer, mimeType, width, height, byteLength } =
          decodeBase64Image(dataBase64);

        await ensureImagesTable();

        const id = crypto.randomUUID();
        const cleanFilename = filename ? filename.trim().slice(0, 255) : null;

        await executeQuery(
          `INSERT INTO images (id, data, mime_type, width, height, filename)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, buffer, mimeType, width, height, cleanFilename]
        );

        const result = {
          id,
          url: `/api/images/${id}`,
          mimeType,
          width,
          height,
          byteLength,
          filename: cleanFilename,
        };

        if (options.onRevalidate) {
          await options.onRevalidate([`/api/images/${id}`]);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `upload_image error: ${error.message}` }],
        };
      }
    }
  );

  // list_images
  server.tool(
    "list_images",
    "List stored images with pagination and metadata (without raw binary).",
    listImagesShape,
    async ({ page = 1, perPage = 20 }) => {
      try {
        await ensureImagesTable();
        const limit = perPage;
        const offset = (page - 1) * perPage;

        const [rows, countRes] = await Promise.all([
          executeQuery(
            `SELECT id, mime_type AS "mimeType", width, height, filename, created_at AS "createdAt"
             FROM images
             ORDER BY created_at DESC, id DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
          ),
          executeQuery("SELECT COUNT(*)::int AS count FROM images"),
        ]);

        const totalCount = countRes[0]?.count ?? 0;
        const images = rows.map((img) => ({
          ...img,
          url: `/api/images/${img.id}`,
        }));

        const result = {
          images,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `list_images error: ${error.message}` }],
        };
      }
    }
  );

  // delete_image
  server.tool(
    "delete_image",
    "Delete an image from PostgreSQL. Fails if referenced by members/projects/products unless force: true.",
    deleteImageShape,
    async ({ id, force = false }) => {
      try {
        await ensureImagesTable();
        const existing = await executeQuery(
          "SELECT id FROM images WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return {
            isError: true,
            content: [{ type: "text", text: `Image '${id}' not found.` }],
          };
        }

        const imageUrl = `/api/images/${id}`;

        if (!force) {
          const [memberRefs, projectRefs, productRefs] = await Promise.all([
            executeQuery(
              "SELECT id, name FROM members WHERE picture_url = $1",
              [imageUrl]
            ),
            executeQuery(
              "SELECT id, name FROM projects WHERE picture_url = $1",
              [imageUrl]
            ),
            executeQuery(
              "SELECT id, name FROM products WHERE picture_url = $1",
              [imageUrl]
            ),
          ]);

          const references = [
            ...memberRefs.map((m) => ({ type: "member", ...m })),
            ...projectRefs.map((p) => ({ type: "project", ...p })),
            ...productRefs.map((p) => ({ type: "product", ...p })),
          ];

          if (references.length > 0) {
            const summary = references
              .map((r) => `${r.type} '${r.name}' (id: ${r.id})`)
              .join(", ");
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Cannot delete image '${id}': it is referenced by ${references.length} record(s): ${summary}. Set force: true to delete anyway.`,
                },
              ],
            };
          }
        }

        await executeQuery("DELETE FROM images WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate([`/api/images/${id}`]);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, message: `Image '${id}' deleted successfully.` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `delete_image error: ${error.message}` }],
        };
      }
    }
  );
}
