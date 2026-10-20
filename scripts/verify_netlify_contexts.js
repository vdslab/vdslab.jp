#!/usr/bin/env node

/**
 * scripts/verify_netlify_contexts.js
 *
 * Deterministic, read-only verification of Netlify deploy context isolation.
 * Validates that:
 *  - .netlify/state.json is linked to active site ID (178e3fb4-13a4-4fb9-9878-bb1eb20b1486)
 *  - Netlify Cloud API schema contains explicit contextual values and correct scopes
 *  - Context 'production' resolves strictly to vdslab_jp
 *  - Context 'deploy-preview' resolves strictly to vdslab_jp_staging
 *  - Context 'branch-deploy' resolves strictly to vdslab_jp_staging
 *  - Context 'deploy-preview' and 'branch-deploy' resolve MCP_API_KEY to test-mcp-api-key-for-playwright
 *  - Scopes (builds, functions, runtime) resolve correctly
 *  - No phantom branch override exists (e.g. from comma-separated CLI syntax errors)
 *  - Live read-only database queries confirm the targeted database
 *
 * Exit codes:
 *   0: All assertions PASSED (Gate Passed)
 *   1: One or more assertions FAILED (Gate Blocked)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const pg = require("pg");

const EXPECTED_SITE_ID = "178e3fb4-13a4-4fb9-9878-bb1eb20b1486";
const EXPECTED_PROD_DB = "vdslab_jp";
const EXPECTED_STAGING_DB = "vdslab_jp_staging";
const EXPECTED_HOST = process.env.EXPECTED_DB_HOST || (process.env.DATABASE_URL ? (new URL(process.env.DATABASE_URL)).hostname : null);
const EXPECTED_PORT = "5432";
const EXPECTED_PROD_USER = "vdslab_jp";
const EXPECTED_STAGING_USER = "vdslab_jp_staging";
const EXPECTED_MCP_KEY = "test-mcp-api-key-for-playwright";

// Resolve Netlify Auth Token safely
function resolveAuthToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  if (process.env.NETLIFY_PERSONAL_ACCESS_TOKEN) return process.env.NETLIFY_PERSONAL_ACCESS_TOKEN;

  const mcpConfigPath = path.join(process.env.HOME || "/home/likr", ".gemini/config/mcp_config.json");
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf8"));
      return config?.mcpServers?.netlify?.env?.NETLIFY_PERSONAL_ACCESS_TOKEN || null;
    } catch (_) {}
  }
  return null;
}

// Resolve Linked Site ID
function resolveSiteId() {
  if (process.env.NETLIFY_SITE_ID) return process.env.NETLIFY_SITE_ID;
  const statePath = path.join(process.cwd(), ".netlify", "state.json");
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (state.siteId) return state.siteId;
    } catch (_) {}
  }
  return EXPECTED_SITE_ID;
}

const token = resolveAuthToken();
const siteId = resolveSiteId();

if (!token) {
  console.error("❌ ERROR: Netlify authentication token could not be resolved.");
  console.error("Please set NETLIFY_AUTH_TOKEN or configure mcp_config.json.");
  process.exit(1);
}

const env = { ...process.env, NETLIFY_SITE_ID: siteId, NETLIFY_AUTH_TOKEN: token };

const failures = [];
const successes = [];

function assert(condition, message, errorDetail) {
  if (condition) {
    successes.push(message);
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failures.push({ message, detail: errorDetail });
    console.error(`  ✗ [FAIL] ${message}`);
    if (errorDetail) console.error(`    Details: ${errorDetail}`);
  }
}

async function queryCli(key, context, scope) {
  const scopeFlag = scope ? `--scope ${scope}` : "";
  const cmd = `npx netlify env:get ${key} --context ${context} ${scopeFlag} --json`;
  try {
    const stdout = execSync(cmd, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const parsed = JSON.parse(stdout.trim());
    return parsed[key] || null;
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchRawApi() {
  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function testDatabaseHandshake(dbUrl, expectedDbName, label, expectedUser = EXPECTED_PROD_USER) {
  if (!dbUrl || typeof dbUrl !== "string") {
    assert(false, `Database Handshake: ${label}`, "No valid connection URL to test");
    return;
  }
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  let client;
  try {
    client = await pool.connect();
    // Strictly read-only query
    const res = await client.query("SELECT current_database(), current_user, inet_server_addr();");
    const row = res.rows[0];
    const actualDb = row.current_database;
    const actualUser = row.current_user;
    const actualHost = String(row.inet_server_addr);

    assert(
      actualDb === expectedDbName,
      `Handshake ${label}: connected to database '${expectedDbName}'`,
      `Expected '${expectedDbName}', but connected to '${actualDb}'`
    );
    assert(
      actualUser === expectedUser,
      `Handshake ${label}: connected as user '${expectedUser}'`,
      `Expected '${expectedUser}', but user is '${actualUser}'`
    );
    const targetHost = parseDbUrl(dbUrl)?.host || EXPECTED_HOST;
    assert(
      actualHost === targetHost || (EXPECTED_HOST && actualHost === EXPECTED_HOST),
      `Handshake ${label}: server IP matches Cloud SQL host '${targetHost || actualHost}'`,
      `Expected '${targetHost || EXPECTED_HOST}', but connected to '${actualHost}'`
    );
  } catch (err) {
    assert(false, `Handshake ${label}: connection succeeded`, err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

function parseDbUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return null;
  try {
    const u = new URL(urlString);
    return {
      protocol: u.protocol,
      user: u.username,
      host: u.hostname,
      port: u.port,
      database: u.pathname.replace(/^\//, ""),
      full: urlString
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("       NETLIFY DEPLOY CONTEXT ISOLATION VERIFICATION PROTOCOL (M2)             ");
  console.log("===============================================================================");
  console.log(`Target Site ID:      ${siteId}`);
  console.log(`Expected Prod DB:    ${EXPECTED_PROD_DB}`);
  console.log(`Expected Staging DB: ${EXPECTED_STAGING_DB}\n`);

  // --- Step 1: Site Linkage & State Check ---
  console.log("[Step 1/4] Verifying CLI Site Linkage (.netlify/state.json)...");
  const statePath = path.join(process.cwd(), ".netlify", "state.json");
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert(
        state.siteId === EXPECTED_SITE_ID,
        "A7: .netlify/state.json linked to active site ID",
        `Expected ${EXPECTED_SITE_ID}, found ${state.siteId}`
      );
    } catch (e) {
      assert(false, "A7: .netlify/state.json is valid JSON", e.message);
    }
  } else {
    assert(false, "A7: .netlify/state.json exists", "File not found");
  }

  // --- Step 2: Cloud API Schema Check ---
  console.log("\n[Step 2/4] Verifying Netlify Cloud API Environment Variable Schema...");
  const rawApiData = await fetchRawApi();
  if (rawApiData.error) {
    assert(false, "A8: Query Netlify API for site environment variables", rawApiData.error);
  } else {
    // Check DATABASE_URL
    const dbVar = rawApiData.find(v => v.key === "DATABASE_URL");
    assert(!!dbVar, "A8.1: DATABASE_URL variable exists in Netlify configuration", "Variable not found");

    if (dbVar) {
      const values = dbVar.values || [];
      const hasDp = values.some(v => v.context === "deploy-preview");
      const hasBd = values.some(v => v.context === "branch-deploy");
      const hasProd = values.some(v => v.context === "production");

      assert(hasDp, "A8.2: DATABASE_URL defines explicit 'deploy-preview' contextual value", "Missing deploy-preview entry in values array");
      assert(hasBd, "A8.3: DATABASE_URL defines explicit 'branch-deploy' contextual value", "Missing branch-deploy entry in values array");
      assert(hasProd, "A8.4: DATABASE_URL defines explicit 'production' contextual value", "Missing production entry in values array");

      // Verify scopes include builds and functions
      const scopes = dbVar.scopes || [];
      const hasBuilds = scopes.includes("builds");
      const hasFunctions = scopes.includes("functions");
      const hasRuntime = scopes.includes("runtime");
      assert(hasBuilds && hasFunctions && hasRuntime, "A8.5: DATABASE_URL scopes cover 'builds', 'functions', and 'runtime'", `Current scopes: ${scopes.join(", ")}`);

      // Verify no phantom branch overrides
      const phantomBranches = values.filter(v => v.context === "branch" || (v.context_parameter && v.context_parameter.includes(",")));
      assert(phantomBranches.length === 0, "A8.6: No phantom branch override detected in DATABASE_URL", `Found phantom overrides: ${JSON.stringify(phantomBranches)}`);
    }

    // Check MCP_API_KEY
    const mcpVar = rawApiData.find(v => v.key === "MCP_API_KEY");
    assert(!!mcpVar, "A8.7: MCP_API_KEY variable exists in Netlify configuration", "Variable not found");

    if (mcpVar) {
      const values = mcpVar.values || [];
      const hasDp = values.some(v => v.context === "deploy-preview" && v.value === EXPECTED_MCP_KEY);
      const hasBd = values.some(v => v.context === "branch-deploy" && v.value === EXPECTED_MCP_KEY);

      assert(hasDp, "A8.8: MCP_API_KEY defines explicit 'deploy-preview' contextual value", "Missing deploy-preview entry in MCP_API_KEY values array");
      assert(hasBd, "A8.9: MCP_API_KEY defines explicit 'branch-deploy' contextual value", "Missing branch-deploy entry in MCP_API_KEY values array");

      const scopes = mcpVar.scopes || [];
      const hasBuilds = scopes.includes("builds");
      const hasFunctions = scopes.includes("functions");
      assert(hasBuilds && hasFunctions, "A8.10: MCP_API_KEY scopes cover 'builds' and 'functions'", `Current scopes: ${scopes.join(", ")}`);

      const phantomBranches = values.filter(v => v.context === "branch" || (v.context_parameter && v.context_parameter.includes(",")));
      assert(phantomBranches.length === 0, "A8.11: No phantom branch override detected in MCP_API_KEY", `Found phantom overrides: ${JSON.stringify(phantomBranches)}`);
    }
  }

  // --- Step 3: CLI Hierarchical Resolution Check ---
  console.log("\n[Step 3/4] Verifying Netlify CLI Resolution across Deploy Contexts...");

  const prodRaw = await queryCli("DATABASE_URL", "production");
  const dpRaw = await queryCli("DATABASE_URL", "deploy-preview");
  const bdRaw = await queryCli("DATABASE_URL", "branch-deploy");
  const dpFuncRaw = await queryCli("DATABASE_URL", "deploy-preview", "functions");
  const prodFuncRaw = await queryCli("DATABASE_URL", "production", "functions");
  const dpBuildRaw = await queryCli("DATABASE_URL", "deploy-preview", "builds");
  const prodBuildRaw = await queryCli("DATABASE_URL", "production", "builds");

  const mcpDpRaw = await queryCli("MCP_API_KEY", "deploy-preview");
  const mcpBdRaw = await queryCli("MCP_API_KEY", "branch-deploy");

  const prodUrl = parseDbUrl(prodRaw);
  const dpUrl = parseDbUrl(dpRaw);
  const bdUrl = parseDbUrl(bdRaw);
  const dpFuncUrl = parseDbUrl(dpFuncRaw);
  const prodFuncUrl = parseDbUrl(prodFuncRaw);
  const dpBuildUrl = parseDbUrl(dpBuildRaw);
  const prodBuildUrl = parseDbUrl(prodBuildRaw);

  // Assertion A1: Production context resolves strictly to vdslab_jp
  assert(
    prodUrl && prodUrl.database === EXPECTED_PROD_DB,
    `A1: 'production' context resolves DATABASE_URL to '${EXPECTED_PROD_DB}'`,
    prodUrl ? `Resolved to '${prodUrl.database}'` : `Failed to parse: ${JSON.stringify(prodRaw)}`
  );

  // Assertion A2: Deploy-preview context resolves strictly to vdslab_jp_staging
  assert(
    dpUrl && dpUrl.database === EXPECTED_STAGING_DB,
    `A2: 'deploy-preview' context resolves DATABASE_URL to '${EXPECTED_STAGING_DB}'`,
    dpUrl ? `Resolved to '${dpUrl.database}'` : `Failed to parse: ${JSON.stringify(dpRaw)}`
  );

  // Assertion A3: Branch-deploy context resolves strictly to vdslab_jp_staging
  assert(
    bdUrl && bdUrl.database === EXPECTED_STAGING_DB,
    `A3: 'branch-deploy' context resolves DATABASE_URL to '${EXPECTED_STAGING_DB}'`,
    bdUrl ? `Resolved to '${bdUrl.database}'` : `Failed to parse: ${JSON.stringify(bdRaw)}`
  );

  // Assertion A4: Mutual exclusion (previews MUST NOT equal production)
  assert(
    prodRaw && dpRaw && prodRaw !== dpRaw,
    "A4.1: 'deploy-preview' connection string is distinct from 'production'",
    "deploy-preview shares the exact connection string with production!"
  );
  assert(
    prodRaw && bdRaw && prodRaw !== bdRaw,
    "A4.2: 'branch-deploy' connection string is distinct from 'production'",
    "branch-deploy shares the exact connection string with production!"
  );
  assert(
    dpRaw && bdRaw && dpRaw === bdRaw,
    "A4.3: 'deploy-preview' and 'branch-deploy' resolve to the same staging database",
    `deploy-preview=${dpRaw} vs branch-deploy=${bdRaw}`
  );

  // Assertion A5 & A6: Scope resolution
  assert(
    dpFuncUrl && dpFuncUrl.database === EXPECTED_STAGING_DB,
    `A5.1: 'deploy-preview' with --scope functions resolves to '${EXPECTED_STAGING_DB}'`,
    dpFuncUrl ? `Resolved to '${dpFuncUrl.database}'` : `Failed to parse: ${JSON.stringify(dpFuncRaw)}`
  );
  assert(
    prodFuncUrl && prodFuncUrl.database === EXPECTED_PROD_DB,
    `A5.2: 'production' with --scope functions resolves to '${EXPECTED_PROD_DB}'`,
    prodFuncUrl ? `Resolved to '${prodFuncUrl.database}'` : `Failed to parse: ${JSON.stringify(prodFuncRaw)}`
  );
  assert(
    dpBuildUrl && dpBuildUrl.database === EXPECTED_STAGING_DB,
    `A6.1: 'deploy-preview' with --scope builds resolves to '${EXPECTED_STAGING_DB}'`,
    dpBuildUrl ? `Resolved to '${dpBuildUrl.database}'` : `Failed to parse: ${JSON.stringify(dpBuildRaw)}`
  );
  assert(
    prodBuildUrl && prodBuildUrl.database === EXPECTED_PROD_DB,
    `A6.2: 'production' with --scope builds resolves to '${EXPECTED_PROD_DB}'`,
    prodBuildUrl ? `Resolved to '${prodBuildUrl.database}'` : `Failed to parse: ${JSON.stringify(prodBuildRaw)}`
  );

  // Assertion A7: MCP_API_KEY CLI resolution
  assert(
    mcpDpRaw === EXPECTED_MCP_KEY,
    `A7.1: 'deploy-preview' context resolves MCP_API_KEY to '${EXPECTED_MCP_KEY}'`,
    `Resolved: ${JSON.stringify(mcpDpRaw)}`
  );
  assert(
    mcpBdRaw === EXPECTED_MCP_KEY,
    `A7.2: 'branch-deploy' context resolves MCP_API_KEY to '${EXPECTED_MCP_KEY}'`,
    `Resolved: ${JSON.stringify(mcpBdRaw)}`
  );

  // Assertion A11: Cloud SQL instance host/port checks
  if (prodUrl && dpUrl) {
    const expectedHost = EXPECTED_HOST || prodUrl.host;
    assert(
      prodUrl.host === dpUrl.host && prodUrl.host === expectedHost,
      `A11.1: Both production and preview target Cloud SQL host '${expectedHost}'`,
      `prod=${prodUrl.host}, preview=${dpUrl.host}`
    );
    assert(
      prodUrl.port === EXPECTED_PORT && dpUrl.port === EXPECTED_PORT,
      `A11.2: Both production and preview target PostgreSQL port '${EXPECTED_PORT}'`,
      `prod=${prodUrl.port}, preview=${dpUrl.port}`
    );
  }

  // --- Step 4: Live Target Database Handshake ---
  console.log("\n[Step 4/4] Probing Target Cloud SQL Databases with Read-Only Handshake...");

  if (prodRaw && typeof prodRaw === "string") {
    console.log("  Testing production resolved URL handshake...");
    await testDatabaseHandshake(prodRaw, EXPECTED_PROD_DB, "Production URL", EXPECTED_PROD_USER);
  } else {
    assert(false, "A9: Production URL Database Handshake", "Cannot test: production URL unresolvable");
  }

  if (dpRaw && typeof dpRaw === "string") {
    console.log("  Testing deploy-preview resolved URL handshake...");
    await testDatabaseHandshake(dpRaw, EXPECTED_STAGING_DB, "Deploy-Preview URL", EXPECTED_STAGING_USER);
  } else {
    assert(false, "A10: Deploy-Preview URL Database Handshake", "Cannot test: deploy-preview URL unresolvable");
  }

  // --- Final Report Summary ---
  console.log("\n===============================================================================");
  console.log("                             VERIFICATION SUMMARY                              ");
  console.log("===============================================================================");
  console.log(`Total Assertions Passed: ${successes.length}`);
  console.log(`Total Assertions Failed: ${failures.length}\n`);

  if (failures.length > 0) {
    console.error("❌ GATE CHECK FAILED: The following context isolation checks failed:\n");
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.message}`);
      if (f.detail) console.error(`     Reason: ${f.detail}`);
    });
    console.error("\nAction Required: Correct Netlify environment variable context settings.");
    process.exit(1);
  } else {
    console.log("✅ GATE CHECK PASSED: All Netlify context isolation assertions passed.");
    console.log("   - Production strictly targets 'vdslab_jp'.");
    console.log("   - Previews strictly target 'vdslab_jp_staging'.");
    console.log("   - Zero cross-context data leak detected.");
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("Fatal verification execution error:", err);
    process.exit(1);
  });
}

module.exports = { main, assert, queryCli, fetchRawApi, parseDbUrl };
