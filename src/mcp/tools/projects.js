import crypto from "crypto";
import { executeQuery, withTransaction } from "../../db/pool";
import {
  listProjectsShape,
  getProjectShape,
  createProjectShape,
  updateProjectShape,
  deleteProjectShape,
} from "../schemas";
import { resolvePictureInput, toolSuccess, toolError } from "./utils";

const PROJECT_REVALIDATION_TARGETS = [
  "/",
  "/projects/list",
  { path: "/projects/list/[page]", type: "page" },
  { path: "/projects/[categoryId]/[page]", type: "page" },
];

const SELECT_PROJECT_SQL = `
  SELECT 
    p.id, 
    p.name, 
    p.description, 
    p.start_year AS "startYear",
    p.end_year AS "endYear",
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
  FROM projects p
  LEFT JOIN project_categories pc ON p.id = pc.project_id
  LEFT JOIN categories c ON pc.category_id = c.id
`;

/**
 * Registers Project management tools.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerProjectTools(server, options = {}) {
  // list_projects
  server.tool(
    "list_projects",
    "List lab projects with pagination and optional category filter.",
    listProjectsShape,
    async ({ page = 1, perPage = 10, categoryId }) => {
      try {
        const limit = perPage;
        const offset = (page - 1) * perPage;

        let projectsQuery;
        let countQuery;
        let queryParams;

        if (categoryId) {
          projectsQuery = `
            ${SELECT_PROJECT_SQL}
            WHERE p.id IN (
              SELECT project_id FROM project_categories WHERE category_id = $3
            )
            GROUP BY p.id
            ORDER BY p.start_year DESC, p.id ASC
            LIMIT $1 OFFSET $2
          `;
          countQuery =
            "SELECT COUNT(*)::int AS count FROM project_categories WHERE category_id = $1";
          queryParams = [limit, offset, categoryId];
        } else {
          projectsQuery = `
            ${SELECT_PROJECT_SQL}
            GROUP BY p.id
            ORDER BY p.start_year DESC, p.id ASC
            LIMIT $1 OFFSET $2
          `;
          countQuery = "SELECT COUNT(*)::int AS count FROM projects";
          queryParams = [limit, offset];
        }

        const [rows, countRes] = await Promise.all([
          executeQuery(projectsQuery, queryParams),
          executeQuery(countQuery, categoryId ? [categoryId] : []),
        ]);

        const totalCount = countRes[0]?.count ?? 0;
        return toolSuccess({
          projects: rows,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
        });
      } catch (error) {
        return toolError("list_projects", error);
      }
    }
  );

  // get_project
  server.tool(
    "get_project",
    "Get a single project by ID.",
    getProjectShape,
    async ({ id }) => {
      try {
        const rows = await executeQuery(
          `${SELECT_PROJECT_SQL} WHERE p.id = $1 GROUP BY p.id LIMIT 1`,
          [id]
        );
        if (rows.length === 0) {
          return toolError("get_project", new Error(`Project '${id}' not found.`));
        }
        return toolSuccess({ project: rows[0] });
      } catch (error) {
        return toolError("get_project", error);
      }
    }
  );

  // create_project
  server.tool(
    "create_project",
    "Create a new project.",
    createProjectShape,
    async ({
      name,
      startYear,
      endYear = null,
      description = null,
      categoryIds = [],
      imageId,
      picture,
      id,
    }) => {
      try {
        const projectId = id ? id.trim() : crypto.randomUUID();
        const pic = await resolvePictureInput({ imageId, picture });

        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO projects (
              id, name, description, start_year, end_year,
              picture_url, picture_width, picture_height
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              projectId,
              name,
              description ?? null,
              startYear,
              endYear ?? null,
              pic?.picture_url ?? null,
              pic?.picture_width ?? null,
              pic?.picture_height ?? null,
            ]
          );

          if (categoryIds && categoryIds.length > 0) {
            for (const catId of categoryIds) {
              await client.query(
                `INSERT INTO project_categories (project_id, category_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [projectId, catId]
              );
            }
          }
        });

        const created = await executeQuery(
          `${SELECT_PROJECT_SQL} WHERE p.id = $1 GROUP BY p.id`,
          [projectId]
        );

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PROJECT_REVALIDATION_TARGETS,
            `/projects/detail/${projectId}`,
            { path: "/projects/detail/[projectId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, project: created[0] });
      } catch (error) {
        return toolError("create_project", error);
      }
    }
  );

  // update_project
  server.tool(
    "update_project",
    "Update an existing project (fields and/or category associations).",
    updateProjectShape,
    async ({
      id,
      name,
      startYear,
      endYear,
      description,
      categoryIds,
      imageId,
      picture,
    }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM projects WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("update_project", new Error(`Project '${id}' not found.`));
        }

        await withTransaction(async (client) => {
          const updates = [];
          const values = [id];
          let idx = 2;

          if (name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(name);
          }
          if (startYear !== undefined) {
            updates.push(`start_year = $${idx++}`);
            values.push(startYear);
          }
          if (endYear !== undefined) {
            updates.push(`end_year = $${idx++}`);
            values.push(endYear);
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
              `UPDATE projects SET ${updates.join(", ")} WHERE id = $1`,
              values
            );
          }

          if (categoryIds !== undefined) {
            await client.query(
              "DELETE FROM project_categories WHERE project_id = $1",
              [id]
            );
            for (const catId of categoryIds) {
              await client.query(
                `INSERT INTO project_categories (project_id, category_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [id, catId]
              );
            }
          }
        });

        const updated = await executeQuery(
          `${SELECT_PROJECT_SQL} WHERE p.id = $1 GROUP BY p.id`,
          [id]
        );

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PROJECT_REVALIDATION_TARGETS,
            `/projects/detail/${id}`,
            { path: "/projects/detail/[projectId]", type: "page" },
          ]);
        }

        return toolSuccess({ success: true, project: updated[0] });
      } catch (error) {
        return toolError("update_project", error);
      }
    }
  );

  // delete_project
  server.tool(
    "delete_project",
    "Delete a project by ID.",
    deleteProjectShape,
    async ({ id }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM projects WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("delete_project", new Error(`Project '${id}' not found.`));
        }

        await executeQuery("DELETE FROM projects WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate([
            ...PROJECT_REVALIDATION_TARGETS,
            `/projects/detail/${id}`,
            { path: "/projects/detail/[projectId]", type: "page" },
          ]);
        }

        return toolSuccess({
          success: true,
          message: `Project '${id}' deleted successfully.`,
        });
      } catch (error) {
        return toolError("delete_project", error);
      }
    }
  );
}
