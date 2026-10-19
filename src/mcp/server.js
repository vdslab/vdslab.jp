import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerImageTools } from "./tools/images.js";
import { registerNewsTools } from "./tools/news.js";
import { registerMemberTools } from "./tools/members.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerProductTools } from "./tools/products.js";
import { registerCategoryTools } from "./tools/categories.js";

/**
 * Creates and initializes the VDSLab MCP Server with all 27 tools.
 *
 * @param {{ onRevalidate?: (targets: Array<string | { path: string, type?: string }>) => Promise<void> }} [options]
 * @returns {McpServer}
 */
export function createMcpServer(options = {}) {
  const server = new McpServer({
    name: "vdslab-cms",
    version: "1.0.0",
  });

  registerImageTools(server, options);
  registerNewsTools(server, options);
  registerMemberTools(server, options);
  registerProjectTools(server, options);
  registerProductTools(server, options);
  registerCategoryTools(server, options);

  return server;
}
