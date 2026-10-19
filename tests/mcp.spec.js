// @ts-check
const { test, expect } = require("@playwright/test");

const TEST_API_KEY =
  process.env.MCP_API_KEY || "test-mcp-api-key-for-playwright";

const EXPECTED_TOOLS = [
  "upload_image",
  "list_images",
  "delete_image",
  "list_news",
  "get_news",
  "create_news",
  "update_news",
  "delete_news",
  "list_members",
  "get_member",
  "create_member",
  "update_member",
  "delete_member",
  "list_projects",
  "get_project",
  "create_project",
  "update_project",
  "delete_project",
  "list_products",
  "get_product",
  "create_product",
  "update_product",
  "delete_product",
  "list_categories",
  "create_category",
  "update_category",
  "delete_category",
];

test.describe("Remote MCP Server Tests", () => {
  test.describe("Authentication and HTTP Methods", () => {
    test("GET /api/mcp returns 405 Method Not Allowed", async ({ request }) => {
      const res = await request.get("/api/mcp");
      expect(res.status()).toBe(405);
      const json = await res.json();
      expect(json.error).toContain("Method Not Allowed");
    });

    test("DELETE /api/mcp returns 405 Method Not Allowed", async ({
      request,
    }) => {
      const res = await request.delete("/api/mcp");
      expect(res.status()).toBe(405);
      const json = await res.json();
      expect(json.error).toContain("Method Not Allowed");
    });

    test("POST without Authorization header returns 401", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      });
      expect(res.status()).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Missing Authorization header");
    });

    test("POST with invalid token returns 401", async ({ request }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: "Bearer wrong-key" },
        data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      });
      expect(res.status()).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Invalid token");
    });

    test("POST with different length token returns 401 (no RangeError/500)", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: "Bearer x" },
        data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe("MCP Protocol and Tool Definitions", () => {
    test("POST initialize returns server capabilities and info", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.result).toBeDefined();
      expect(json.result.serverInfo.name).toBe("vdslab-cms");
      expect(json.result.capabilities.tools).toBeDefined();
    });

    test("POST tools/list returns exactly all 27 registered tools", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.result).toBeDefined();
      const tools = json.result.tools;
      expect(tools.length).toBe(27);

      const toolNames = tools.map((t) => t.name).sort();
      expect(toolNames).toEqual([...EXPECTED_TOOLS].sort());

      // Check schemas are attached
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  test.describe("Tool Validation and Image Pipeline", () => {
    test("create_member rejects Student type without assignedYear", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "create_member",
            arguments: {
              name: "Test Student",
              type: "Student",
              // assignedYear missing
            },
          },
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.result.isError).toBe(true);
      expect(json.result.content[0].text).toContain("assignedYear is required");
    });

    test("upload_image rejects corrupted or invalid image data", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "upload_image",
            arguments: {
              dataBase64: "bm90IGFuIGltYWdlIGRhdGE=", // "not an image data"
            },
          },
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.result.isError).toBe(true);
      expect(json.result.content[0].text).toContain("Unsupported image format");
    });

    test("upload_image rejects images exceeding 4MB", async ({ request }) => {
      // 1. Verify image-utils validator rejects buffers > 4MB
      const { decodeBase64Image } = await import("../src/mcp/image-utils");
      const largeBuf = Buffer.alloc(4 * 1024 * 1024 + 10);
      expect(() => decodeBase64Image(largeBuf.toString("base64"))).toThrow(
        /exceeds maximum allowed size/
      );

      // 2. Verify server rejects oversized payload via HTTP 413 or MCP tool error
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "upload_image",
            arguments: {
              dataBase64: largeBuf.toString("base64"),
            },
          },
        },
      });

      if (res.status() === 413) {
        expect(res.status()).toBe(413);
      } else {
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json.result.isError).toBe(true);
        expect(json.result.content[0].text).toContain(
          "exceeds maximum allowed size"
        );
      }
    });

    test("Image lifecycle: upload_image -> serve via /api/images/[id] -> delete_image", async ({
      request,
    }) => {
      // 1x1 transparent PNG
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      // 1. Upload
      const uploadRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: {
            name: "upload_image",
            arguments: {
              dataBase64: pngBase64,
              filename: "test-pixel.png",
            },
          },
        },
      });
      expect(uploadRes.status()).toBe(200);
      const uploadJson = await uploadRes.json();
      expect(uploadJson.result.isError).toBeFalsy();

      const imageInfo = JSON.parse(uploadJson.result.content[0].text);
      expect(imageInfo.id).toBeDefined();
      expect(imageInfo.url).toBe(`/api/images/${imageInfo.id}`);
      expect(imageInfo.mimeType).toBe("image/png");
      expect(imageInfo.width).toBe(1);
      expect(imageInfo.height).toBe(1);

      // 2. Fetch image from /api/images/[id]
      const serveRes = await request.get(imageInfo.url);
      expect(serveRes.status()).toBe(200);
      expect(serveRes.headers()["content-type"]).toBe("image/png");
      expect(serveRes.headers()["cache-control"]).toContain("immutable");
      const serveBody = await serveRes.body();
      expect(serveBody.length).toBe(imageInfo.byteLength);

      // 3. Delete image
      const deleteRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: {
            name: "delete_image",
            arguments: {
              id: imageInfo.id,
            },
          },
        },
      });
      expect(deleteRes.status()).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.result.isError).toBeFalsy();

      // 4. Verify 404 after deletion
      const notFoundRes = await request.get(imageInfo.url);
      expect(notFoundRes.status()).toBe(404);
    });

    test("Read-only tools (list_news, list_members, list_projects, list_products, list_categories) work", async ({
      request,
    }) => {
      const readTools = [
        "list_news",
        "list_members",
        "list_projects",
        "list_products",
        "list_categories",
      ];

      for (let i = 0; i < readTools.length; i++) {
        const toolName = readTools[i];
        const res = await request.post("/api/mcp", {
          headers: { Authorization: `Bearer ${TEST_API_KEY}` },
          data: {
            jsonrpc: "2.0",
            id: 10 + i,
            method: "tools/call",
            params: {
              name: toolName,
              arguments: {},
            },
          },
        });
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json.result.isError).toBeFalsy();
        const content = JSON.parse(json.result.content[0].text);
        expect(content).toBeDefined();
      }
    });
  });
});
