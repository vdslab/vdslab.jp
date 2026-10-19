// @ts-check
const { test, expect } = require("@playwright/test");
const { Pool } = require("pg");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

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

/**
 * Helper to call MCP tools and return formatted result
 */
async function callTool(request, name, args = {}) {
  const res = await request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    data: {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000000) + 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
  });
  const json = await res.json();
  const isError = Boolean(json.result?.isError);
  let content = null;
  const rawText = json.result?.content?.[0]?.text;
  if (rawText) {
    try {
      content = JSON.parse(rawText);
    } catch (_) {
      content = rawText;
    }
  }
  return { status: res.status(), json, isError, content, rawText };
}

test.describe("Remote MCP Server Tests", () => {
  test.beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set.");
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      const res = await pool.query("SELECT current_database() AS dbname;");
      const dbname = res.rows[0]?.dbname;

      if (dbname === "vdslab_jp") {
        throw new Error(
          "FATAL SAFETY VIOLATION: Current database is 'vdslab_jp' (PRODUCTION)! " +
            "Mutation tests must NEVER run against production. Aborting immediately."
        );
      }
      if (dbname !== "vdslab_jp_staging") {
        throw new Error(
          `FATAL SAFETY VIOLATION: Target database is '${dbname}', expected 'vdslab_jp_staging'. Aborting.`
        );
      }
    } finally {
      await pool.end();
    }
  });

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
      const largeBuf = Buffer.alloc(4 * 1024 * 1024 + 10);
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

    test("Multi-format image parsing and serving: JPEG, GIF, and WebP (VP8/VP8L/VP8X)", async ({
      request,
    }) => {
      // 1. JPEG (1x1 baseline)
      const jpegBase64 =
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
      // 2. GIF (1x1 GIF89a)
      const gifBase64 =
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      // 3. WebP Lossless (VP8L 1x1)
      const webpVP8LBase64 =
        "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
      // 4. WebP Lossy (VP8 1x1)
      const webpVP8Base64 =
        "UklGRkAAAABXRUJQVlA4IDQAAACwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=";
      // 5. WebP Extended (VP8X 1x1)
      const vp8xBuf = Buffer.alloc(30);
      vp8xBuf.write("RIFF", 0, 4, "ascii");
      vp8xBuf.writeUInt32LE(22, 4);
      vp8xBuf.write("WEBP", 8, 4, "ascii");
      vp8xBuf.write("VP8X", 12, 4, "ascii");
      vp8xBuf.writeUInt32LE(10, 16);
      vp8xBuf[20] = 0x02; // animation flag
      vp8xBuf.writeUIntLE(0, 24, 3);
      vp8xBuf.writeUIntLE(0, 27, 3);
      const webpVP8XBase64 = vp8xBuf.toString("base64");

      const testCases = [
        { name: "JPEG", data: jpegBase64, mime: "image/jpeg" },
        { name: "GIF", data: gifBase64, mime: "image/gif" },
        { name: "WebP-VP8L", data: webpVP8LBase64, mime: "image/webp" },
        { name: "WebP-VP8", data: webpVP8Base64, mime: "image/webp" },
        { name: "WebP-VP8X", data: webpVP8XBase64, mime: "image/webp" },
      ];

      for (const tc of testCases) {
        // Upload
        const upRes = await request.post("/api/mcp", {
          headers: { Authorization: `Bearer ${TEST_API_KEY}` },
          data: {
            jsonrpc: "2.0",
            id: 20,
            method: "tools/call",
            params: {
              name: "upload_image",
              arguments: {
                dataBase64: tc.data,
                filename: `test-${tc.name}.bin`,
              },
            },
          },
        });
        expect(upRes.status()).toBe(200);
        const upJson = await upRes.json();
        expect(upJson.result.isError).toBeFalsy();
        const info = JSON.parse(upJson.result.content[0].text);
        expect(info.mimeType).toBe(tc.mime);
        expect(info.width).toBe(1);
        expect(info.height).toBe(1);

        // Fetch
        const getRes = await request.get(info.url);
        expect(getRes.status()).toBe(200);
        expect(getRes.headers()["content-type"]).toBe(tc.mime);

        // Cleanup
        await request.post("/api/mcp", {
          headers: { Authorization: `Bearer ${TEST_API_KEY}` },
          data: {
            jsonrpc: "2.0",
            id: 21,
            method: "tools/call",
            params: { name: "delete_image", arguments: { id: info.id } },
          },
        });
      }
    });

    test("Image reference protection: delete_image fails when referenced by member", async ({
      request,
    }) => {
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      // 1. Upload image
      const upRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 30,
          method: "tools/call",
          params: {
            name: "upload_image",
            arguments: { dataBase64: pngBase64, filename: "ref-test.png" },
          },
        },
      });
      const imgInfo = JSON.parse((await upRes.json()).result.content[0].text);

      // 2. Create member referencing imageId
      const memRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 31,
          method: "tools/call",
          params: {
            name: "create_member",
            arguments: {
              name: "Ref Test Member",
              type: "Student",
              assignedYear: 2024,
              imageId: imgInfo.id,
            },
          },
        },
      });
      const memJson = await memRes.json();
      expect(memJson.result.isError).toBeFalsy();
      const memInfo = JSON.parse(memJson.result.content[0].text).member;
      expect(memInfo.picture.url).toBe(imgInfo.url);

      // 3. Attempt to delete image without force: true -> must fail
      const delFailRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 32,
          method: "tools/call",
          params: {
            name: "delete_image",
            arguments: { id: imgInfo.id, force: false },
          },
        },
      });
      const delFailJson = await delFailRes.json();
      expect(delFailJson.result.isError).toBe(true);
      expect(delFailJson.result.content[0].text).toContain("referenced by");

      // 4. Delete member, then delete image -> must succeed
      await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 33,
          method: "tools/call",
          params: { name: "delete_member", arguments: { id: memInfo.id } },
        },
      });

      const delOkRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 34,
          method: "tools/call",
          params: { name: "delete_image", arguments: { id: imgInfo.id } },
        },
      });
      expect((await delOkRes.json()).result.isError).toBeFalsy();
    });

    test("Date validation rejects invalid calendar dates like 2024-02-30", async ({
      request,
    }) => {
      const res = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 40,
          method: "tools/call",
          params: {
            name: "create_news",
            arguments: {
              title: "Invalid Date News",
              content: "Body",
              date: "2024-02-30",
            },
          },
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.result.isError).toBe(true);
      expect(json.result.content[0].text).toContain("Invalid calendar date");
    });
  });

  test.describe("Complete CRUD Lifecycles for Mutation Tools", () => {
    test("Products CRUD lifecycle: create, get, update, list, and delete", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. Create two categories
        const catARes = await callTool(request, "create_category", {
          name: `Cat A ${suffix}`,
        });
        expect(catARes.isError).toBe(false);
        const catAId = catARes.content.category.id;
        cleanups.push(() =>
          callTool(request, "delete_category", { id: catAId, force: true })
        );

        const catBRes = await callTool(request, "create_category", {
          name: `Cat B ${suffix}`,
        });
        expect(catBRes.isError).toBe(false);
        const catBId = catBRes.content.category.id;
        cleanups.push(() =>
          callTool(request, "delete_category", { id: catBId, force: true })
        );

        // 2. Upload an image
        const imgRes = await callTool(request, "upload_image", {
          dataBase64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          filename: `product-${suffix}.png`,
        });
        expect(imgRes.isError).toBe(false);
        const imgId = imgRes.content.id;
        cleanups.push(() =>
          callTool(request, "delete_image", { id: imgId, force: true })
        );

        // 3. Create product with category A and image
        const prodRes = await callTool(request, "create_product", {
          name: `E2E Product ${suffix}`,
          publishYear: 2024,
          description: "Initial description",
          categoryIds: [catAId],
          imageId: imgId,
        });
        expect(prodRes.isError).toBe(false);
        expect(prodRes.content.success).toBe(true);
        const prodId = prodRes.content.product.id;
        cleanups.push(() => callTool(request, "delete_product", { id: prodId }));

        expect(prodRes.content.product.name).toBe(`E2E Product ${suffix}`);
        expect(prodRes.content.product.publishYear).toBe(2024);
        expect(prodRes.content.product.picture.url).toBe(`/api/images/${imgId}`);
        expect(prodRes.content.product.categories.length).toBe(1);
        expect(prodRes.content.product.categories[0].id).toBe(catAId);

        // 4. get_product
        const getRes = await callTool(request, "get_product", { id: prodId });
        expect(getRes.isError).toBe(false);
        expect(getRes.content.product.name).toBe(`E2E Product ${suffix}`);
        expect(getRes.content.product.categories[0].id).toBe(catAId);

        // 5. update_product: update name, publishYear, description, switch to category B
        const updateRes = await callTool(request, "update_product", {
          id: prodId,
          name: `E2E Product Updated ${suffix}`,
          publishYear: 2025,
          description: "Updated description",
          categoryIds: [catBId],
        });
        expect(updateRes.isError).toBe(false);
        expect(updateRes.content.product.name).toBe(
          `E2E Product Updated ${suffix}`
        );
        expect(updateRes.content.product.publishYear).toBe(2025);
        expect(updateRes.content.product.description).toBe(
          "Updated description"
        );
        expect(updateRes.content.product.categories.length).toBe(1);
        expect(updateRes.content.product.categories[0].id).toBe(catBId);

        // 6. list_products with category filter
        const listBRes = await callTool(request, "list_products", {
          categoryId: catBId,
        });
        expect(listBRes.isError).toBe(false);
        const foundInB = listBRes.content.products.some(
          (p) => p.id === prodId
        );
        expect(foundInB).toBe(true);

        const listARes = await callTool(request, "list_products", {
          categoryId: catAId,
        });
        expect(listARes.isError).toBe(false);
        const foundInA = listARes.content.products.some(
          (p) => p.id === prodId
        );
        expect(foundInA).toBe(false);

        // 7. delete_product
        const delRes = await callTool(request, "delete_product", { id: prodId });
        expect(delRes.isError).toBe(false);
        expect(delRes.content.success).toBe(true);

        // Verify get_product returns not found
        const getAfterDel = await callTool(request, "get_product", {
          id: prodId,
        });
        expect(getAfterDel.isError).toBe(true);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });

    test("Members CRUD lifecycle: Staff vs Student types, validation, and profile updates", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. Validation: non-Staff without assignedYear must be rejected
        const invalidStudent = await callTool(request, "create_member", {
          name: `Invalid Student ${suffix}`,
          type: "Student",
        });
        expect(invalidStudent.isError).toBe(true);
        expect(invalidStudent.rawText).toContain("assignedYear is required");

        // 2. Create Staff member (assignedYear can be null, direct picture object)
        const staffRes = await callTool(request, "create_member", {
          name: `Prof. Staff ${suffix}`,
          type: "Staff",
          assignedYear: null,
          title: "教授 / Professor",
          description: "Visual Analytics Research",
          order: 1,
          picture: {
            url: "https://example.com/staff-avatar.jpg",
            width: 300,
            height: 300,
          },
        });
        expect(staffRes.isError).toBe(false);
        const staffId = staffRes.content.member.id;
        cleanups.push(() =>
          callTool(request, "delete_member", { id: staffId })
        );

        expect(staffRes.content.member.type).toBe("Staff");
        expect(staffRes.content.member.assignedYear).toBeNull();
        expect(staffRes.content.member.picture.url).toBe(
          "https://example.com/staff-avatar.jpg"
        );

        // 3. get_member for Staff
        const getStaffRes = await callTool(request, "get_member", {
          id: staffId,
        });
        expect(getStaffRes.isError).toBe(false);
        expect(getStaffRes.content.member.title).toBe("教授 / Professor");

        // 4. update_member for Staff: update title, order, and clear picture
        const updateStaffRes = await callTool(request, "update_member", {
          id: staffId,
          title: "特任教授 / Project Professor",
          order: 5,
          picture: null,
        });
        expect(updateStaffRes.isError).toBe(false);
        expect(updateStaffRes.content.member.title).toBe(
          "特任教授 / Project Professor"
        );
        expect(updateStaffRes.content.member.order).toBe(5);
        expect(updateStaffRes.content.member.picture).toBeNull();

        // 5. Upload image for Student
        const imgRes = await callTool(request, "upload_image", {
          dataBase64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          filename: `student-${suffix}.png`,
        });
        expect(imgRes.isError).toBe(false);
        const imgId = imgRes.content.id;
        cleanups.push(() =>
          callTool(request, "delete_image", { id: imgId, force: true })
        );

        // 6. Create Student member with assignedYear and imageId
        const studRes = await callTool(request, "create_member", {
          name: `Student ${suffix}`,
          type: "Student",
          assignedYear: 2024,
          title: "学部4年 / B4",
          description: "Information visualization",
          order: 10,
          imageId: imgId,
        });
        expect(studRes.isError).toBe(false);
        const studId = studRes.content.member.id;
        cleanups.push(() =>
          callTool(request, "delete_member", { id: studId })
        );

        expect(studRes.content.member.assignedYear).toBe(2024);
        expect(studRes.content.member.picture.url).toBe(`/api/images/${imgId}`);

        // 7. Validation: updating student assignedYear to null must fail
        const invalidUpdateStud = await callTool(request, "update_member", {
          id: studId,
          assignedYear: null,
        });
        expect(invalidUpdateStud.isError).toBe(true);
        expect(invalidUpdateStud.rawText).toContain("assignedYear cannot be null");

        // 8. Valid update student
        const validUpdateStud = await callTool(request, "update_member", {
          id: studId,
          description: "Updated student bio",
        });
        expect(validUpdateStud.isError).toBe(false);
        expect(validUpdateStud.content.member.description).toBe(
          "Updated student bio"
        );

        // 9. list_members
        const listStaff = await callTool(request, "list_members", {
          type: "Staff",
        });
        expect(listStaff.isError).toBe(false);
        expect(listStaff.content.members.some((m) => m.id === staffId)).toBe(
          true
        );

        const listStud = await callTool(request, "list_members", {
          type: "Student",
          assignedYear: 2024,
        });
        expect(listStud.isError).toBe(false);
        expect(listStud.content.members.some((m) => m.id === studId)).toBe(
          true
        );

        // 10. Delete members
        const delStaff = await callTool(request, "delete_member", {
          id: staffId,
        });
        expect(delStaff.isError).toBe(false);
        const delStud = await callTool(request, "delete_member", {
          id: studId,
        });
        expect(delStud.isError).toBe(false);

        // Verify get_member returns error
        const getAfterDel = await callTool(request, "get_member", {
          id: staffId,
        });
        expect(getAfterDel.isError).toBe(true);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });

    test("Categories CRUD lifecycle: update, reference protection, and forced deletion cascade", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. Create category
        const catRes = await callTool(request, "create_category", {
          name: `Cat Initial ${suffix}`,
        });
        expect(catRes.isError).toBe(false);
        const catId = catRes.content.category.id;
        cleanups.push(() =>
          callTool(request, "delete_category", { id: catId, force: true })
        );

        // 2. Update category
        const updateCatRes = await callTool(request, "update_category", {
          id: catId,
          name: `Cat Renamed ${suffix}`,
        });
        expect(updateCatRes.isError).toBe(false);
        expect(updateCatRes.content.category.name).toBe(
          `Cat Renamed ${suffix}`
        );

        // Verify in list_categories
        const listRes = await callTool(request, "list_categories");
        expect(listRes.isError).toBe(false);
        const foundCat = listRes.content.categories.find(
          (c) => c.id === catId
        );
        expect(foundCat).toBeDefined();
        expect(foundCat.name).toBe(`Cat Renamed ${suffix}`);

        // 3. Link category to a product
        const prodRes = await callTool(request, "create_product", {
          name: `Cat Ref Product ${suffix}`,
          publishYear: 2024,
          categoryIds: [catId],
        });
        expect(prodRes.isError).toBe(false);
        const prodId = prodRes.content.product.id;
        cleanups.push(() => callTool(request, "delete_product", { id: prodId }));

        // 4. Reference protection: delete_category without force must fail
        const delFail = await callTool(request, "delete_category", {
          id: catId,
          force: false,
        });
        expect(delFail.isError).toBe(true);
        expect(delFail.rawText).toContain("referenced by");
        expect(delFail.rawText).toContain("product(s)");

        // 5. Forced deletion: delete_category with force: true must succeed and cascade
        const delForce = await callTool(request, "delete_category", {
          id: catId,
          force: true,
        });
        expect(delForce.isError).toBe(false);
        expect(delForce.content.success).toBe(true);

        // Verify category is deleted
        const listAfterDel = await callTool(request, "list_categories");
        expect(
          listAfterDel.content.categories.some((c) => c.id === catId)
        ).toBe(false);

        // Verify product still exists, but category link is gone
        const prodAfterCatDel = await callTool(request, "get_product", {
          id: prodId,
        });
        expect(prodAfterCatDel.isError).toBe(false);
        expect(prodAfterCatDel.content.product.categories.length).toBe(0);

        // 6. Delete product
        const delProd = await callTool(request, "delete_product", {
          id: prodId,
        });
        expect(delProd.isError).toBe(false);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });

    test("Projects CRUD lifecycle: create with categories and image, get, update, and delete", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. Create category
        const catRes = await callTool(request, "create_category", {
          name: `Proj Cat ${suffix}`,
        });
        expect(catRes.isError).toBe(false);
        const catId = catRes.content.category.id;
        cleanups.push(() =>
          callTool(request, "delete_category", { id: catId, force: true })
        );

        // 2. Upload image
        const imgRes = await callTool(request, "upload_image", {
          dataBase64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          filename: `project-${suffix}.png`,
        });
        expect(imgRes.isError).toBe(false);
        const imgId = imgRes.content.id;
        cleanups.push(() =>
          callTool(request, "delete_image", { id: imgId, force: true })
        );

        // 3. Create project
        const projRes = await callTool(request, "create_project", {
          name: `E2E Project ${suffix}`,
          startYear: 2022,
          endYear: null,
          description: "Exploratory visualization system",
          categoryIds: [catId],
          imageId: imgId,
        });
        expect(projRes.isError).toBe(false);
        const projId = projRes.content.project.id;
        cleanups.push(() => callTool(request, "delete_project", { id: projId }));

        expect(projRes.content.project.name).toBe(`E2E Project ${suffix}`);
        expect(projRes.content.project.startYear).toBe(2022);
        expect(projRes.content.project.endYear).toBeNull();
        expect(projRes.content.project.picture.url).toBe(
          `/api/images/${imgId}`
        );
        expect(projRes.content.project.categories.length).toBe(1);

        // 4. get_project
        const getRes = await callTool(request, "get_project", { id: projId });
        expect(getRes.isError).toBe(false);
        expect(getRes.content.project.name).toBe(`E2E Project ${suffix}`);
        expect(getRes.content.project.categories[0].id).toBe(catId);

        // 5. update_project
        const updateRes = await callTool(request, "update_project", {
          id: projId,
          name: `E2E Project Concluded ${suffix}`,
          startYear: 2022,
          endYear: 2024,
          description: "Concluded exploratory research",
          categoryIds: [],
        });
        expect(updateRes.isError).toBe(false);
        expect(updateRes.content.project.name).toBe(
          `E2E Project Concluded ${suffix}`
        );
        expect(updateRes.content.project.endYear).toBe(2024);
        expect(updateRes.content.project.categories.length).toBe(0);

        // 6. list_projects
        const listRes = await callTool(request, "list_projects");
        expect(listRes.isError).toBe(false);
        expect(listRes.content.projects.some((p) => p.id === projId)).toBe(
          true
        );

        // 7. delete_project
        const delRes = await callTool(request, "delete_project", {
          id: projId,
        });
        expect(delRes.isError).toBe(false);

        // Verify get_project returns error
        const getAfterDel = await callTool(request, "get_project", {
          id: projId,
        });
        expect(getAfterDel.isError).toBe(true);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });

    test("Images CRUD, list_images, multi-entity reference protection, and forced deletion", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. Upload image with Data URL prefix
        const dataUri =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const upRes = await callTool(request, "upload_image", {
          dataBase64: dataUri,
          filename: `data-uri-${suffix}.png`,
        });
        expect(upRes.isError).toBe(false);
        const imgId = upRes.content.id;
        cleanups.push(() =>
          callTool(request, "delete_image", { id: imgId, force: true })
        );

        expect(upRes.content.mimeType).toBe("image/png");
        expect(upRes.content.width).toBe(1);
        expect(upRes.content.height).toBe(1);

        // 2. list_images
        const listRes = await callTool(request, "list_images", {
          page: 1,
          perPage: 10,
        });
        expect(listRes.isError).toBe(false);
        expect(listRes.content.images.some((img) => img.id === imgId)).toBe(
          true
        );

        // 3. Link image to Product
        const prodRes = await callTool(request, "create_product", {
          name: `Img Ref Product ${suffix}`,
          publishYear: 2024,
          imageId: imgId,
        });
        expect(prodRes.isError).toBe(false);
        const prodId = prodRes.content.product.id;
        cleanups.push(() => callTool(request, "delete_product", { id: prodId }));

        // 4. Attempt delete_image without force: true -> must fail
        const delFail = await callTool(request, "delete_image", {
          id: imgId,
          force: false,
        });
        expect(delFail.isError).toBe(true);
        expect(delFail.rawText).toContain("referenced by");
        expect(delFail.rawText).toContain("product");

        // 5. Delete image with force: true -> must succeed
        const delForce = await callTool(request, "delete_image", {
          id: imgId,
          force: true,
        });
        expect(delForce.isError).toBe(false);
        expect(delForce.content.success).toBe(true);

        // Verify image 404
        const getImgRes = await request.get(`/api/images/${imgId}`);
        expect(getImgRes.status()).toBe(404);

        // 6. Delete product
        const delProd = await callTool(request, "delete_product", {
          id: prodId,
        });
        expect(delProd.isError).toBe(false);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });

    test("News CRUD lifecycle: create, get, update, list, and delete", async ({
      request,
    }) => {
      const cleanups = [];
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        // 1. create_news (using past date 2020-01-15 so it does not interfere with top-3 page rankings)
        const createRes = await callTool(request, "create_news", {
          title: `E2E News ${suffix}`,
          content: "Initial news content",
          date: "2020-01-15",
        });
        expect(createRes.isError).toBe(false);
        const newsId = createRes.content.post.id;
        cleanups.push(() => callTool(request, "delete_news", { id: newsId }));

        expect(createRes.content.post.title).toBe(`E2E News ${suffix}`);
        expect(createRes.content.post.date).toBe("2020-01-15");

        // 2. get_news
        const getRes = await callTool(request, "get_news", { id: newsId });
        expect(getRes.isError).toBe(false);
        expect(getRes.content.post.title).toBe(`E2E News ${suffix}`);

        // 3. update_news
        const updateRes = await callTool(request, "update_news", {
          id: newsId,
          title: `E2E News Updated ${suffix}`,
          content: "Updated news content",
          date: "2020-01-20",
        });
        expect(updateRes.isError).toBe(false);
        expect(updateRes.content.post.title).toBe(`E2E News Updated ${suffix}`);
        expect(updateRes.content.post.content).toBe("Updated news content");
        expect(updateRes.content.post.date).toBe("2020-01-20");

        // 4. list_news
        const listRes = await callTool(request, "list_news", {
          page: 1,
          perPage: 10,
        });
        expect(listRes.isError).toBe(false);
        expect(listRes.content.news.length).toBeGreaterThan(0);

        // 5. delete_news
        const delRes = await callTool(request, "delete_news", { id: newsId });
        expect(delRes.isError).toBe(false);
        expect(delRes.content.success).toBe(true);

        // Verify get_news returns error
        const getAfterDel = await callTool(request, "get_news", { id: newsId });
        expect(getAfterDel.isError).toBe(true);
      } finally {
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch (_) {}
        }
      }
    });
  });
});
