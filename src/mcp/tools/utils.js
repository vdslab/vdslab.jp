import { executeQuery } from "../../db/pool";

/**
 * Resolves picture fields (picture_url, picture_width, picture_height)
 * based on provided imageId or picture object.
 *
 * @param {{ imageId?: string | null, picture?: { url: string, width: number, height: number } | null }} input
 * @returns {Promise<{ picture_url: string | null, picture_width: number | null, picture_height: number | null } | undefined>}
 */
export async function resolvePictureInput(input) {
  if (input.imageId) {
    const rows = await executeQuery(
      "SELECT id, width, height FROM images WHERE id = $1 LIMIT 1",
      [input.imageId]
    );
    if (rows.length === 0) {
      throw new Error(
        `Image with id '${input.imageId}' was not found in images table.`
      );
    }
    return {
      picture_url: `/api/images/${rows[0].id}`,
      picture_width: rows[0].width,
      picture_height: rows[0].height,
    };
  }

  if (input.picture) {
    return {
      picture_url: input.picture.url,
      picture_width: input.picture.width,
      picture_height: input.picture.height,
    };
  }

  if (input.imageId === null || input.picture === null) {
    return {
      picture_url: null,
      picture_width: null,
      picture_height: null,
    };
  }

  return undefined;
}

/**
 * Wraps successful tool result in MCP response format.
 */
export function toolSuccess(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Wraps error in MCP response format.
 */
export function toolError(toolName, error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `${toolName} error: ${error.message || error}`,
      },
    ],
  };
}
