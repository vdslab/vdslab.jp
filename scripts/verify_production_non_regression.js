#!/usr/bin/env node

/**
 * scripts/verify_production_non_regression.js (Proposed Deliverable for M3)
 *
 * Production Non-Regression & Immutability Verification Protocol.
 *
 * Provides cryptographic and engine-level proof of ZERO mutations on production DB (vdslab_jp).
 * Supports three execution modes:
 *
 * 1. Snapshot Capture (--capture [--out=<filename>]):
 *    Connects to production DB, records baseline row counts, SQL-MD5, Client-SHA256,
 *    and pg_stat_user_tables tuple counters (n_tup_ins, n_tup_upd, n_tup_del).
 *
 * 2. Post-Test Verification (--verify --baseline=<filename>):
 *    Connects to production DB, re-evaluates all metrics, and strictly asserts:
 *      - Total production rows === 239
 *      - All 8 table row counts match baseline
 *      - All 8 table SQL-MD5 and Client-SHA256 checksums match baseline
 *      - All delta tuple counters (Δ n_tup_ins, Δ n_tup_upd, Δ n_tup_del) === 0
 *
 * 3. Direct Baseline Check (default when no flags provided):
 *    Verifies live database against hardcoded canonical PROJECT.md baseline.
 *
 * Exit Codes:
 *   0: Invariance PASSED (Zero mutations proven)
 *   1: Verification FAILED (Mutation or mismatch detected)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pg = require("pg");

const EXPECTED_PROD_DB = "vdslab_jp";

const BASELINE = {
  categories: {
    rows: 30,
    sql_md5: "96cde4457642b32a54dd40a74861bc55",
    sha256: "8cd3d79ae6296e4c370ffb66d3d91efba34763873b5eca1bf3c5f68584aaf173"
  },
  members: {
    rows: 73,
    sql_md5: "31fc7e615c315a2f65bafd5495ea766b",
    sha256: "9286a36138af4208905dd4641024b80700a92b90fd8d4a4a29ed57663b5dc6d6"
  },
  posts: {
    rows: 28,
    sql_md5: "72f00e51f39d475d74e0a3dc0df8dd15",
    sha256: "d35e8d1a4d10b1489ca8961d7c9dbb5a3975feef01e93bb2f3ab6fca30b11b5c"
  },
  products: {
    rows: 25,
    sql_md5: "c2d283e6bdbe4099e9479473f7bb8f94",
    sha256: "dfa4f6f203c18e9ec2f216c9ffe14dab58157d5b007dc62807e0559e2ce28b28"
  },
  projects: {
    rows: 7,
    sql_md5: "952ae5714a6f01ec6542b62db2b8edfd",
    sha256: "8ecf10a124398f497254786da6a8958ed513f3a4aaeb5d569ab8bc07755d9fc2"
  },
  product_categories: {
    rows: 60,
    sql_md5: "4306578252fe0295cddb6cf504c0cf01",
    sha256: "11ce93b40d1e56e0a49b0dabd162ec4c14bb405f9170ead732136033806eb179"
  },
  project_categories: {
    rows: 16,
    sql_md5: "592ce48b7e514e380e5cf8a798e82ed9",
    sha256: "91eb90d9c770a0177e3df72adb6acffd2b64cb57340b467cb81cdaf76ac025a7"
  },
  images: {
    rows: 0,
    sql_md5: "EMPTY",
    sha256: "EMPTY"
  }
};

const TABLES = [
  { name: "categories", pk: ["id"] },
  { name: "members", pk: ["id"] },
  { name: "posts", pk: ["id"] },
  { name: "products", pk: ["id"] },
  { name: "projects", pk: ["id"] },
  { name: "product_categories", pk: ["product_id", "category_id"] },
  { name: "project_categories", pk: ["project_id", "category_id"] },
  { name: "images", pk: ["id"] }
];

async function collectDatabaseState(client) {
  const dbInfo = await client.query("SELECT current_database(), current_user, inet_server_addr();");
  const actualDb = dbInfo.rows[0].current_database;
  const actualUser = dbInfo.rows[0].current_user;
  const actualHost = String(dbInfo.rows[0].inet_server_addr);

  if (actualDb !== EXPECTED_PROD_DB) {
    throw new Error(`CRITICAL TARGET ERROR: Expected database '${EXPECTED_PROD_DB}', but connected to '${actualDb}'!`);
  }

  // 1. Table Row Counts & Cryptographic Hashes
  const tableData = {};
  let totalRows = 0;

  for (const { name, pk } of TABLES) {
    const pkOrder = pk.map(c => `"${c}" ASC`).join(", ");

    // SQL MD5
    const sqlRes = await client.query(`
      SELECT COUNT(*)::int as count,
        COALESCE(
          md5(string_agg(row_data, '' ORDER BY row_num)),
          'EMPTY'
        ) as sql_md5
      FROM (
        SELECT md5(row_to_json(t)::text) as row_data, row_number() over() as row_num
        FROM (SELECT * FROM "${name}" ORDER BY ${pkOrder}) t
      ) sub;
    `);

    const rowCount = sqlRes.rows[0].count;
    const sqlMd5 = sqlRes.rows[0].sql_md5;
    totalRows += rowCount;

    // Client SHA-256
    const rowsRes = await client.query(`SELECT * FROM "${name}" ORDER BY ${pkOrder}`);
    const sha256 = crypto.createHash("sha256");
    for (const row of rowsRes.rows) {
      const sortedKeys = Object.keys(row).sort();
      const norm = {};
      for (const k of sortedKeys) {
        const val = row[k];
        norm[k] = val instanceof Date
          ? val.toISOString()
          : (Buffer.isBuffer(val) ? val.toString("hex") : val);
      }
      sha256.update(JSON.stringify(norm));
    }
    const clientSha256 = rowsRes.rows.length > 0 ? sha256.digest("hex") : "EMPTY";

    tableData[name] = {
      rowCount,
      sqlMd5,
      clientSha256
    };
  }

  // 2. Engine Tuple Statistics from pg_stat_user_tables
  const statsRes = await client.query(`
    SELECT relname, n_tup_ins::bigint, n_tup_upd::bigint, n_tup_del::bigint
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY relname;
  `);

  const tupleStats = {};
  for (const row of statsRes.rows) {
    tupleStats[row.relname] = {
      ins: Number(row.n_tup_ins),
      upd: Number(row.n_tup_upd),
      del: Number(row.n_tup_del)
    };
  }

  // 3. Compute Database Master Checksum
  const masterHashInput = TABLES.map(t => `${t.name}:${tableData[t.name].sqlMd5}:${tableData[t.name].clientSha256}`).join("|");
  const masterChecksum = crypto.createHash("sha256").update(masterHashInput).digest("hex");

  return {
    timestamp: new Date().toISOString(),
    database: actualDb,
    user: actualUser,
    host: actualHost,
    totalRows,
    masterChecksum,
    tables: tableData,
    tupleStats
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isCapture = args.some(a => a === "--capture" || a.startsWith("--capture="));
  const isVerify = args.some(a => a === "--verify" || a.startsWith("--verify="));
  const outFileArg = args.find(a => a.startsWith("--out="));
  const baselineArg = args.find(a => a.startsWith("--baseline="));

  const connectionString = process.env.DATABASE_URL || process.env.TARGET_DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL or TARGET_DATABASE_URL environment variable is required.");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const currentState = await collectDatabaseState(client);

    if (isCapture) {
      console.log("=== CAPTURING PRODUCTION BASELINE SNAPSHOT ===");
      console.log(`Database: ${currentState.database} on ${currentState.host}`);
      console.log(`Timestamp: ${currentState.timestamp}`);
      console.log(`Total Rows: ${currentState.totalRows}`);
      console.log(`Master Checksum: ${currentState.masterChecksum}\n`);

      const outPath = outFileArg ? outFileArg.split("=")[1] : ".prod-baseline-m3.json";
      const resolvedOut = path.resolve(process.cwd(), outPath);
      fs.writeFileSync(resolvedOut, JSON.stringify(currentState, null, 2), "utf8");
      console.log(`✓ Baseline snapshot saved to: ${resolvedOut}`);
      process.exit(0);
    }

    if (isVerify && baselineArg) {
      const baselinePath = path.resolve(process.cwd(), baselineArg.split("=")[1]);
      if (!fs.existsSync(baselinePath)) {
        console.error(`ERROR: Baseline file not found: ${baselinePath}`);
        process.exit(1);
      }
      const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

      console.log("===============================================================================");
      console.log("       PRODUCTION NON-REGRESSION & IMMUTABILITY AUDIT VERIFICATION            ");
      console.log("===============================================================================");
      console.log(`Target Database:  ${currentState.database} (Host: ${currentState.host})`);
      console.log(`Baseline Capture: ${baseline.timestamp}`);
      console.log(`Current Time:     ${currentState.timestamp}\n`);

      let hasFailure = false;
      const evaluationResults = [];

      for (const { name } of TABLES) {
        const cur = currentState.tables[name];
        const base = baseline.tables[name];
        const curStat = currentState.tupleStats[name] || { ins: 0, upd: 0, del: 0 };
        const baseStat = baseline.tupleStats[name] || { ins: 0, upd: 0, del: 0 };

        const dIns = curStat.ins - baseStat.ins;
        const dUpd = curStat.upd - baseStat.upd;
        const dDel = curStat.del - baseStat.del;

        const countMatch = cur.rowCount === base.rowCount;
        const md5Match = cur.sqlMd5 === base.sqlMd5;
        const shaMatch = cur.clientSha256 === base.clientSha256;
        const tupleMatch = dIns === 0 && dUpd === 0 && dDel === 0;

        const tablePass = countMatch && md5Match && shaMatch && tupleMatch;
        if (!tablePass) hasFailure = true;

        evaluationResults.push({
          table: name,
          rows: `${cur.rowCount} (exp ${base.rowCount})`,
          countMatch,
          md5Match,
          shaMatch,
          deltaTuples: `+${dIns}/+${dUpd}/+${dDel}`,
          status: tablePass ? "✓ PASS" : "✗ MUTATED"
        });
      }

      console.table(evaluationResults);

      const totalMatch = currentState.totalRows === 239 && baseline.totalRows === 239;
      const masterMatch = currentState.masterChecksum === baseline.masterChecksum;

      console.log(`Total Rows Match:     ${totalMatch ? "✓ PASS (239)" : "✗ FAIL (" + currentState.totalRows + ")"}`);
      console.log(`Master Checksum Match: ${masterMatch ? "✓ PASS (" + currentState.masterChecksum.slice(0, 16) + "...)" : "✗ FAIL"}`);

      if (hasFailure || !totalMatch || !masterMatch) {
        console.error("\n❌ NON-REGRESSION FAILURE: Mutation detected on production database vdslab_jp!");
        process.exit(1);
      } else {
        console.log("\n✅ NON-REGRESSION VERIFIED: All 8 tables, 239 rows, checksums, and tuple counters invariant.");
        console.log("   - Exactly 0 rows inserted, updated, or deleted on production.");
        process.exit(0);
      }
    }

    // Default mode: Compare against hardcoded baseline
    console.log("=== PRODUCTION DATABASE BASELINE CHECK ===");
    console.log(`Connected to: ${currentState.database} on ${currentState.host}`);
    let hasFailure = false;

    for (const { name } of TABLES) {
      const exp = BASELINE[name];
      const cur = currentState.tables[name];
      const countMatch = cur.rowCount === exp.rows;
      const md5Match = cur.sqlMd5 === exp.sql_md5;
      const shaMatch = cur.clientSha256 === exp.sha256;
      const pass = countMatch && md5Match && shaMatch;
      if (!pass) hasFailure = true;

      const stat = currentState.tupleStats[name] || { ins: 0, upd: 0, del: 0 };
      console.log(`${pass ? "✓ PASS" : "✗ FAIL"} ${name.padEnd(20)} Rows: ${String(cur.rowCount).padStart(3)} | MD5: ${cur.sqlMd5} | Tuples: ins=${stat.ins},upd=${stat.upd},del=${stat.del}`);
    }

    console.log(`\nTotal Rows: ${currentState.totalRows} / Expected: 239`);
    if (hasFailure || currentState.totalRows !== 239) {
      console.error("\n❌ Baseline verification FAILED!");
      process.exit(1);
    } else {
      console.log("\n✅ Baseline verification PASSED: All tables match project baseline.");
      process.exit(0);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("Execution error:", err);
    process.exit(1);
  });
}

module.exports = {
  collectDatabaseState,
  BASELINE,
  TABLES,
  EXPECTED_PROD_DB
};
