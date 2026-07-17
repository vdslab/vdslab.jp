const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  await client.connect();
  console.log("Successfully connected to database. Running schema.sql...");

  const sql = fs.readFileSync(path.join(__dirname, "../schema.sql"), "utf8");
  
  // schema.sql は複数のステートメントを含んでいるので、client.query(sql) で一括実行できます。
  await client.query(sql);
  
  console.log("Schema initialized successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("Failed to initialize schema:", err);
  process.exit(1);
});
