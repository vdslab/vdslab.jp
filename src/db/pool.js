import pg from "pg";

const { Pool } = pg;

const globalForDb = globalThis;

/**
 * Returns the singleton PostgreSQL pool.
 */
export function getPool() {
  if (!globalForDb.__pgPool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set.");
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });

    globalForDb.__pgPool = pool;
  }

  return globalForDb.__pgPool;
}

/**
 * Execute a query with parameters and return the resulting rows.
 */
export async function executeQuery(query, params = []) {
  const p = getPool();
  const res = await p.query(query, params);
  return res.rows;
}

/**
 * Execute operations within a database transaction.
 * @template T
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback transaction:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
