import { revalidatePath } from "next/cache";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "../../../mcp/auth.js";
import { createMcpServer } from "../../../mcp/server.js";

export const dynamic = "force-dynamic";

/**
 * Handle incoming MCP JSON-RPC requests via POST.
 */
export async function POST(request) {
  // 1. Bearer token authentication
  const auth = authenticateRequest(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Read request body and normalize Accept header for MCP streamable HTTP transport
  const rawBody = await request.text();
  const headers = new Headers(request.headers);
  const accept = headers.get("accept") || "";
  if (!accept.includes("text/event-stream") || !accept.includes("application/json")) {
    headers.set("accept", "application/json, text/event-stream");
  }

  const effectiveRequest = new Request(request.url, {
    method: request.method,
    headers,
    body: rawBody,
  });

  // 3. Create a fresh McpServer and stateless transport per request
  const server = createMcpServer({
    onRevalidate: async (targets) => {
      for (const target of targets) {
        try {
          if (typeof target === "string") {
            revalidatePath(target);
          } else if (target && target.path) {
            revalidatePath(target.path, target.type || "page");
          }
        } catch (err) {
          console.warn("revalidatePath error:", err);
        }
      }
    },
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  // 4. Delegate to transport
  try {
    return await transport.handleRequest(effectiveRequest);
  } catch (err) {
    console.error("MCP transport error:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: err.message || "Internal error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Stateless MCP endpoint does not support GET.
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      error: "Method Not Allowed: Stateless MCP endpoint only supports POST",
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST",
      },
    }
  );
}

/**
 * Stateless MCP endpoint does not support DELETE.
 */
export async function DELETE() {
  return new Response(
    JSON.stringify({
      error: "Method Not Allowed: Stateless MCP endpoint only supports POST",
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST",
      },
    }
  );
}
