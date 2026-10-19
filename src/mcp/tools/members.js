import crypto from "crypto";
import { executeQuery } from "../../db/pool.js";
import {
  listMembersShape,
  getMemberShape,
  createMemberShape,
  updateMemberShape,
  deleteMemberShape,
} from "../schemas.js";
import { resolvePictureInput, toolSuccess, toolError } from "./utils.js";

const MEMBER_REVALIDATION_TARGETS = ["/members"];

const SELECT_MEMBER_SQL = `
  SELECT 
    id, 
    name, 
    title, 
    description, 
    CASE 
      WHEN picture_url IS NOT NULL THEN json_build_object('url', picture_url, 'width', picture_width, 'height', picture_height)
      ELSE NULL
    END AS picture,
    type,
    "order",
    assigned_year AS "assignedYear"
  FROM members
`;

/**
 * Registers Member management tools.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 */
export function registerMemberTools(server, options = {}) {
  // list_members
  server.tool(
    "list_members",
    "List lab members with optional filtering by type or assignedYear.",
    listMembersShape,
    async ({ type, assignedYear }) => {
      try {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (type) {
          conditions.push(`type = $${idx++}`);
          values.push(type);
        }
        if (assignedYear !== undefined) {
          conditions.push(`assigned_year = $${idx++}`);
          values.push(assignedYear);
        }

        const whereClause =
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const query = `${SELECT_MEMBER_SQL} ${whereClause} ORDER BY "order" ASC, id ASC`;

        const rows = await executeQuery(query, values);
        return toolSuccess({ members: rows, count: rows.length });
      } catch (error) {
        return toolError("list_members", error);
      }
    }
  );

  // get_member
  server.tool(
    "get_member",
    "Get details of a single member by ID.",
    getMemberShape,
    async ({ id }) => {
      try {
        const rows = await executeQuery(
          `${SELECT_MEMBER_SQL} WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (rows.length === 0) {
          return toolError("get_member", new Error(`Member '${id}' not found.`));
        }
        return toolSuccess({ member: rows[0] });
      } catch (error) {
        return toolError("get_member", error);
      }
    }
  );

  // create_member
  server.tool(
    "create_member",
    "Create a new lab member. Note: assignedYear is required for Student and GraduateStudent types.",
    createMemberShape,
    async ({
      name,
      type,
      assignedYear,
      title = null,
      description = null,
      order = 0,
      imageId,
      picture,
      id,
    }) => {
      try {
        if (type !== "Staff" && (assignedYear === undefined || assignedYear === null)) {
          return toolError(
            "create_member",
            new Error(
              `assignedYear is required for member type '${type}' to maintain site layout.`
            )
          );
        }

        const memberId =
          id && id.trim() ? id.trim() : crypto.randomUUID();
        const pic = await resolvePictureInput({ imageId, picture });

        const rows = await executeQuery(
          `INSERT INTO members (
            id, name, type, assigned_year, title, description, "order",
            picture_url, picture_width, picture_height
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            memberId,
            name,
            type,
            assignedYear ?? null,
            title ?? null,
            description ?? null,
            order ?? 0,
            pic?.picture_url ?? null,
            pic?.picture_width ?? null,
            pic?.picture_height ?? null,
          ]
        );

        const created = await executeQuery(
          `${SELECT_MEMBER_SQL} WHERE id = $1`,
          [rows[0].id]
        );

        if (options.onRevalidate) {
          await options.onRevalidate(MEMBER_REVALIDATION_TARGETS);
        }

        return toolSuccess({ success: true, member: created[0] });
      } catch (error) {
        return toolError("create_member", error);
      }
    }
  );

  // update_member
  server.tool(
    "update_member",
    "Update an existing member's profile or photo.",
    updateMemberShape,
    async ({
      id,
      name,
      type,
      assignedYear,
      title,
      description,
      order,
      imageId,
      picture,
    }) => {
      try {
        const existing = await executeQuery(
          "SELECT id, type, assigned_year FROM members WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("update_member", new Error(`Member '${id}' not found.`));
        }

        const effectiveType = type ?? existing[0].type;
        const effectiveYear =
          assignedYear !== undefined ? assignedYear : existing[0].assigned_year;

        if (
          effectiveType !== "Staff" &&
          (effectiveYear === null || effectiveYear === undefined)
        ) {
          return toolError(
            "update_member",
            new Error(
              `assignedYear cannot be null for member type '${effectiveType}'.`
            )
          );
        }

        const updates = [];
        const values = [id];
        let idx = 2;

        if (name !== undefined) {
          updates.push(`name = $${idx++}`);
          values.push(name);
        }
        if (type !== undefined) {
          updates.push(`type = $${idx++}`);
          values.push(type);
        }
        if (assignedYear !== undefined) {
          updates.push(`assigned_year = $${idx++}`);
          values.push(assignedYear);
        }
        if (title !== undefined) {
          updates.push(`title = $${idx++}`);
          values.push(title);
        }
        if (description !== undefined) {
          updates.push(`description = $${idx++}`);
          values.push(description);
        }
        if (order !== undefined) {
          updates.push(`"order" = $${idx++}`);
          values.push(order);
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
          await executeQuery(
            `UPDATE members SET ${updates.join(", ")} WHERE id = $1`,
            values
          );
        }

        const updated = await executeQuery(
          `${SELECT_MEMBER_SQL} WHERE id = $1`,
          [id]
        );

        if (options.onRevalidate) {
          await options.onRevalidate(MEMBER_REVALIDATION_TARGETS);
        }

        return toolSuccess({ success: true, member: updated[0] });
      } catch (error) {
        return toolError("update_member", error);
      }
    }
  );

  // delete_member
  server.tool(
    "delete_member",
    "Delete a member by ID.",
    deleteMemberShape,
    async ({ id }) => {
      try {
        const existing = await executeQuery(
          "SELECT id FROM members WHERE id = $1 LIMIT 1",
          [id]
        );
        if (existing.length === 0) {
          return toolError("delete_member", new Error(`Member '${id}' not found.`));
        }

        await executeQuery("DELETE FROM members WHERE id = $1", [id]);

        if (options.onRevalidate) {
          await options.onRevalidate(MEMBER_REVALIDATION_TARGETS);
        }

        return toolSuccess({
          success: true,
          message: `Member '${id}' deleted successfully.`,
        });
      } catch (error) {
        return toolError("delete_member", error);
      }
    }
  );
}
