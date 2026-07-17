const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
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

  try {
    await client.connect();
    console.log("Connected to database. Reading schema.sql...");
    const schemaPath = path.join(__dirname, "../schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    console.log("Applying schema...");
    await client.query(sql);
    console.log("Schema applied successfully!");
  } catch (error) {
    console.error("Error applying schema:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
