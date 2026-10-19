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

    test("Full CRUD Lifecycle: News, Projects, and Categories with reference guards", async ({
      request,
    }) => {
      // 1. News CRUD
      const createNewsRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 50,
          method: "tools/call",
          params: {
            name: "create_news",
            arguments: {
              title: "E2E Lifecycle News",
              content: "Initial content",
              date: "2024-06-15",
              id: null,
            },
          },
        },
      });
      const newsInfo = JSON.parse((await createNewsRes.json()).result.content[0].text).post;

      const getNewsRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 51,
          method: "tools/call",
          params: { name: "get_news", arguments: { id: newsInfo.id } },
        },
      });
      expect(JSON.parse((await getNewsRes.json()).result.content[0].text).post.title).toBe(
        "E2E Lifecycle News"
      );

      const updateNewsRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 52,
          method: "tools/call",
          params: {
            name: "update_news",
            arguments: { id: newsInfo.id, title: "E2E News Updated" },
          },
        },
      });
      expect(
        JSON.parse((await updateNewsRes.json()).result.content[0].text).post.title
      ).toBe("E2E News Updated");

      await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 53,
          method: "tools/call",
          params: { name: "delete_news", arguments: { id: newsInfo.id } },
        },
      });

      // 2. Category & Project CRUD + Reference Protection
      const createCatRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 60,
          method: "tools/call",
          params: {
            name: "create_category",
            arguments: { name: "E2E Category " + Date.now(), id: null },
          },
        },
      });
      const catInfo = JSON.parse((await createCatRes.json()).result.content[0].text).category;

      const createProjRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 61,
          method: "tools/call",
          params: {
            name: "create_project",
            arguments: {
              name: "E2E Project",
              startYear: 2024,
              categoryIds: [catInfo.id],
              id: null,
            },
          },
        },
      });
      const projInfo = JSON.parse((await createProjRes.json()).result.content[0].text).project;
      expect(projInfo.categories.length).toBe(1);

      // Attempt to delete category without force -> must fail
      const delCatFailRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 62,
          method: "tools/call",
          params: {
            name: "delete_category",
            arguments: { id: catInfo.id, force: false },
          },
        },
      });
      const delCatFailJson = await delCatFailRes.json();
      expect(delCatFailJson.result.isError).toBe(true);
      expect(delCatFailJson.result.content[0].text).toContain("referenced by");

      // Cleanup project and category
      await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 63,
          method: "tools/call",
          params: { name: "delete_project", arguments: { id: projInfo.id } },
        },
      });

      const delCatOkRes = await request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        data: {
          jsonrpc: "2.0",
          id: 64,
          method: "tools/call",
          params: { name: "delete_category", arguments: { id: catInfo.id } },
        },
      });
      expect((await delCatOkRes.json()).result.isError).toBeFalsy();
    });
  });
});
