#!/usr/bin/env node

/**
 * scripts/verify_db.js
 *
 * Verifies database row counts and cryptographic checksums (SQL-MD5 and Client-SHA256)
 * against the production baseline established in PROJECT.md.
 *
 * Uses @next/env to simulate Next.js App Router environment resolution precedence
 * (.env.local before .env), with CLI argument override support.
 */

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const pg = require("pg");
const crypto = require("crypto");

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

async function main() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: No DATABASE_URL found.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const dbInfo = await client.query("SELECT current_database(), current_user, inet_server_addr();");
    console.log(`Connected to: ${dbInfo.rows[0].current_database} on ${dbInfo.rows[0].inet_server_addr} as ${dbInfo.rows[0].current_user}`);

    let totalRows = 0;
    let hasFailure = false;

    for (const { name, pk } of TABLES) {
      const expected = BASELINE[name];
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
        ) sub
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
          norm[k] = val instanceof Date ? val.toISOString() : (Buffer.isBuffer(val) ? val.toString("hex") : val);
        }
        sha256.update(JSON.stringify(norm));
      }
      const clientSha256 = rowsRes.rows.length > 0 ? sha256.digest("hex") : "EMPTY";

      const countMatch = rowCount === expected.rows;
      const md5Match = sqlMd5 === expected.sql_md5;
      const shaMatch = clientSha256 === expected.sha256;

      const status = countMatch && md5Match && shaMatch ? "✓ PASS" : "✗ FAIL";
      if (!countMatch || !md5Match || !shaMatch) hasFailure = true;

      console.log(`${status} ${name.padEnd(20)} Rows: ${String(rowCount).padStart(3)} (exp: ${String(expected.rows).padStart(3)}) | MD5: ${sqlMd5} | SHA: ${clientSha256}`);
    }

    console.log(`\nTotal Rows: ${totalRows} / Expected: 239`);
    if (hasFailure || totalRows !== 239) {
      console.error("\n❌ Verification FAILED: Hash or row count mismatch detected.");
      process.exit(1);
    } else {
      console.log("\n✅ Verification PASSED: All tables and checksums match perfectly.");
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

module.exports = { BASELINE, TABLES };
