import crypto from "crypto";

/**
 * Result of authentication check.
 * @typedef {{ ok: true } | { ok: false, status: number, error: string }} AuthResult
 */

/**
 * Authenticates an incoming HTTP request using Bearer MCP_API_KEY.
 *
 * @param {Request} request
 * @returns {AuthResult}
 */
export function authenticateRequest(request) {
  const expectedKey = process.env.MCP_API_KEY;
  if (!expectedKey) {
    return {
      ok: false,
      status: 503,
      error: "MCP_API_KEY is not configured on server",
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      ok: false,
      status: 401,
      error: "Missing Authorization header",
    };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "Invalid Authorization header format. Expected 'Bearer <token>'",
    };
  }

  const token = match[1];

  // Hash both to fixed 32-byte buffers with SHA-256 to prevent timing attacks and RangeError
  const expectedHash = crypto.createHash("sha256").update(expectedKey).digest();
  const tokenHash = crypto.createHash("sha256").update(token).digest();

  if (!crypto.timingSafeEqual(tokenHash, expectedHash)) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized: Invalid token",
    };
  }

  return { ok: true };
}
