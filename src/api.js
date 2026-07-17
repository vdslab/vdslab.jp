import pg from "pg";

const { Pool } = pg;

let pool = null;
let isMockMode = false;

function getPool() {
  if (isMockMode) return null;
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Falling back to mock data.");
    isMockMode = true;
    return null;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

async function executeQuery(query, params = [], mockFallback = []) {
  const p = getPool();
  if (!p || isMockMode) {
    return typeof mockFallback === "function" ? mockFallback() : mockFallback;
  }
  try {
    const res = await p.query(query, params);
    return res.rows;
  } catch (error) {
    console.error(
      "Database query failed, falling back to mock data:",
      error.message
    );
    isMockMode = true;
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    return typeof mockFallback === "function" ? mockFallback() : mockFallback;
  }
}

export function getCategories() {
  return executeQuery("SELECT id, name FROM categories", [], []).then(
    (rows) => ({ categories: rows })
  );
}

export async function getMembers() {
  const rows = await executeQuery(
    `SELECT 
      id, 
      name, 
      title, 
      description, 
      CASE 
        WHEN picture_url IS NOT NULL THEN json_build_object('url', picture_url, 'width', picture_width, 'height', picture_height)
        ELSE NULL
      END AS picture,
      type,
      "order",
      assigned_year AS "assignedYear"
    FROM members
    ORDER BY "order" ASC, id ASC`,
    [],
    []
  );

  const staffs = rows.filter((m) => m.type === "Staff");
  const students = rows.filter((m) => m.type === "Student");
  const graduateStudents = rows.filter((m) => m.type === "GraduateStudent");
  const graduateStudentDoctor = rows.filter(
    (m) => m.type === "GraduateStudentDoctor"
  );

  return { staffs, students, graduateStudents, graduateStudentDoctor };
}

export function getPost(postId) {
  return executeQuery(
    "SELECT id, title, content, date::text AS date FROM posts WHERE id = $1 LIMIT 1",
    [postId],
    []
  ).then((rows) => ({ post: rows[0] || null }));
}

export async function getPostCount() {
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM posts",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getPosts(page = 1, perPage = 5) {
  const limit = perPage;
  const offset = (page - 1) * perPage;

  const [posts, countRes] = await Promise.all([
    executeQuery(
      "SELECT id, title, content, date::text AS date FROM posts ORDER BY date DESC, id DESC LIMIT $1 OFFSET $2",
      [limit, offset],
      []
    ),
    executeQuery("SELECT COUNT(*)::int AS count FROM posts", [], [{ count: 0 }]),
  ]);

  return {
    posts,
    count: {
      aggregate: {
        count: countRes[0]?.count ?? 0,
      },
    },
  };
}

export function getPostIds() {
  return executeQuery("SELECT id FROM posts", [], []).then((rows) => ({
    posts: rows,
  }));
}

export async function getProducts(page = 1, perPage = 5) {
  const limit = perPage;
  const offset = (page - 1) * perPage;

  const [products, countRes] = await Promise.all([
    executeQuery(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.publish_year AS "publishYear",
        CASE 
          WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
          ELSE NULL
        END AS picture,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.publish_year DESC, p.id ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
      []
    ),
    executeQuery(
      "SELECT COUNT(*)::int AS count FROM products",
      [],
      [{ count: 0 }]
    ),
  ]);

  return {
    products,
    count: {
      aggregate: {
        count: countRes[0]?.count ?? 0,
      },
    },
  };
}

export function getProduct(productId) {
  return executeQuery(
    `SELECT 
      p.id, 
      p.name, 
      p.description, 
      p.publish_year AS "publishYear",
      CASE 
        WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
        ELSE NULL
      END AS picture,
      COALESCE(
        json_agg(
          json_build_object('id', c.id, 'name', c.name)
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) AS categories
    FROM products p
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = $1
    GROUP BY p.id`,
    [productId],
    []
  ).then((rows) => ({ product: rows[0] || null }));
}

export async function getProductsByCategoryId(
  page = 1,
  perPage = 5,
  categoryId
) {
  const limit = perPage;
  const offset = (page - 1) * perPage;

  const [products, countRes] = await Promise.all([
    executeQuery(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.publish_year AS "publishYear",
        CASE 
          WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
          ELSE NULL
        END AS picture,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id IN (
        SELECT product_id 
        FROM product_categories 
        WHERE category_id = $3
      )
      GROUP BY p.id
      ORDER BY p.publish_year DESC, p.id ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset, categoryId],
      []
    ),
    executeQuery(
      "SELECT COUNT(*)::int AS count FROM product_categories WHERE category_id = $1",
      [categoryId],
      [{ count: 0 }]
    ),
  ]);

  return {
    products,
    count: {
      aggregate: {
        count: countRes[0]?.count ?? 0,
      },
    },
  };
}

export async function getProductCountByCategoryId(categoryId) {
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM product_categories WHERE category_id = $1",
    [categoryId],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export function getProductIds() {
  return executeQuery("SELECT id FROM products", [], []).then((rows) => ({
    products: rows,
  }));
}

export async function getProductCount() {
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM products",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProductCategories() {
  const rows = await executeQuery(
    `SELECT DISTINCT c.id, c.name 
     FROM categories c
     INNER JOIN product_categories pc ON c.id = pc.category_id`,
    [],
    []
  );
  return { productCategories: rows };
}

export async function getProjects(page = 1, perPage = 5) {
  const limit = perPage;
  const offset = (page - 1) * perPage;

  const [projects, countRes] = await Promise.all([
    executeQuery(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.start_year AS "startYear",
        p.end_year AS "endYear",
        CASE 
          WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
          ELSE NULL
        END AS picture,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM projects p
      LEFT JOIN project_categories pc ON p.id = pc.project_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.start_year DESC, p.id ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
      []
    ),
    executeQuery(
      "SELECT COUNT(*)::int AS count FROM projects",
      [],
      [{ count: 0 }]
    ),
  ]);

  return {
    projects,
    count: {
      aggregate: {
        count: countRes[0]?.count ?? 0,
      },
    },
  };
}

export function getProject(projectId) {
  return executeQuery(
    `SELECT 
      p.id, 
      p.name, 
      p.description, 
      p.start_year AS "startYear",
      p.end_year AS "endYear",
      CASE 
        WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
        ELSE NULL
      END AS picture,
      COALESCE(
        json_agg(
          json_build_object('id', c.id, 'name', c.name)
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) AS categories
    FROM projects p
    LEFT JOIN project_categories pc ON p.id = pc.project_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = $1
    GROUP BY p.id`,
    [projectId],
    []
  ).then((rows) => ({ project: rows[0] || null }));
}

export async function getProjectsByCategoryId(
  page = 1,
  perPage = 5,
  categoryId
) {
  const limit = perPage;
  const offset = (page - 1) * perPage;

  const [projects, countRes] = await Promise.all([
    executeQuery(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.start_year AS "startYear",
        p.end_year AS "endYear",
        CASE 
          WHEN p.picture_url IS NOT NULL THEN json_build_object('url', p.picture_url, 'width', p.picture_width, 'height', p.picture_height)
          ELSE NULL
        END AS picture,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM projects p
      LEFT JOIN project_categories pc ON p.id = pc.project_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id IN (
        SELECT project_id 
        FROM project_categories 
        WHERE category_id = $3
      )
      GROUP BY p.id
      ORDER BY p.start_year DESC, p.id ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset, categoryId],
      []
    ),
    executeQuery(
      "SELECT COUNT(*)::int AS count FROM project_categories WHERE category_id = $1",
      [categoryId],
      [{ count: 0 }]
    ),
  ]);

  return {
    projects,
    count: {
      aggregate: {
        count: countRes[0]?.count ?? 0,
      },
    },
  };
}

export async function getProjectCountByCategoryId(categoryId) {
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM project_categories WHERE category_id = $1",
    [categoryId],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export function getProjectIds() {
  return executeQuery("SELECT id FROM projects", [], []).then((rows) => ({
    projects: rows,
  }));
}

export async function getProjectCount() {
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM projects",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProjectCategories() {
  const rows = await executeQuery(
    `SELECT DISTINCT c.id, c.name 
     FROM categories c
     INNER JOIN project_categories pc ON c.id = pc.category_id`,
    [],
    []
  );
  return { projectCategories: rows };
}
