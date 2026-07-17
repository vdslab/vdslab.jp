import pg from "pg";
import mockData from "./data/mockData.json";

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

export async function getCategories() {
  if (isMockMode || !getPool()) {
    return { categories: mockData.categories };
  }
  return executeQuery("SELECT id, name FROM categories", [], []).then(
    (rows) => ({ categories: rows })
  );
}

export async function getMembers() {
  if (isMockMode || !getPool()) {
    const rows = mockData.members.map(m => ({
      id: m.id,
      name: m.name,
      title: m.title || null,
      description: m.description || null,
      picture: m.picture ? { url: m.picture.url, width: m.picture.width, height: m.picture.height } : null,
      type: m.type,
      order: m.order || 0,
      assignedYear: m.assignedYear || null
    }));
    
    rows.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });

    const staffs = rows.filter((m) => m.type === "Staff");
    const students = rows.filter((m) => m.type === "Student");
    const graduateStudents = rows.filter((m) => m.type === "GraduateStudent");
    const graduateStudentDoctor = rows.filter(
      (m) => m.type === "GraduateStudentDoctor"
    );

    return { staffs, students, graduateStudents, graduateStudentDoctor };
  }

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

export async function getPost(postId) {
  if (isMockMode || !getPool()) {
    const post = mockData.posts.find(p => p.id === postId) || null;
    return { post };
  }
  return executeQuery(
    "SELECT id, title, content, date::text AS date FROM posts WHERE id = $1 LIMIT 1",
    [postId],
    []
  ).then((rows) => ({ post: rows[0] || null }));
}

export async function getPostCount() {
  if (isMockMode || !getPool()) {
    return mockData.posts.length;
  }
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM posts",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getPosts(page = 1, perPage = 5) {
  if (isMockMode || !getPool()) {
    const sorted = [...mockData.posts].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.id.localeCompare(a.id);
    });
    const start = (page - 1) * perPage;
    const posts = sorted.slice(start, start + perPage);
    return {
      posts,
      count: {
        aggregate: {
          count: mockData.posts.length,
        },
      },
    };
  }

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

export async function getPostIds() {
  if (isMockMode || !getPool()) {
    return { posts: mockData.posts.map(p => ({ id: p.id })) };
  }
  return executeQuery("SELECT id FROM posts", [], []).then((rows) => ({
    posts: rows,
  }));
}

export async function getProducts(page = 1, perPage = 5) {
  if (isMockMode || !getPool()) {
    const sorted = [...mockData.products].sort((a, b) => {
      const yearA = a.publishYear || 0;
      const yearB = b.publishYear || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.id.localeCompare(b.id);
    });
    const start = (page - 1) * perPage;
    const products = sorted.slice(start, start + perPage).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      publishYear: p.publishYear || null,
      picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
      categories: p.categories || []
    }));
    return {
      products,
      count: {
        aggregate: {
          count: mockData.products.length,
        },
      },
    };
  }

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

export async function getProduct(productId) {
  if (isMockMode || !getPool()) {
    const p = mockData.products.find(p => p.id === productId);
    if (!p) return { product: null };
    return {
      product: {
        id: p.id,
        name: p.name,
        description: p.description || null,
        publishYear: p.publishYear || null,
        picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
        categories: p.categories || []
      }
    };
  }

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

export async function getProductsByCategoryId(page = 1, perPage = 5, categoryId) {
  if (isMockMode || !getPool()) {
    const filtered = mockData.products.filter(p => p.categories && p.categories.some(c => c.id === categoryId));
    const sorted = [...filtered].sort((a, b) => {
      const yearA = a.publishYear || 0;
      const yearB = b.publishYear || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.id.localeCompare(b.id);
    });
    const start = (page - 1) * perPage;
    const products = sorted.slice(start, start + perPage).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      publishYear: p.publishYear || null,
      picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
      categories: p.categories || []
    }));
    return {
      products,
      count: {
        aggregate: {
          count: filtered.length,
        },
      },
    };
  }

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
  if (isMockMode || !getPool()) {
    const filtered = mockData.products.filter(p => p.categories && p.categories.some(c => c.id === categoryId));
    return filtered.length;
  }
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM product_categories WHERE category_id = $1",
    [categoryId],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProductIds() {
  if (isMockMode || !getPool()) {
    return { products: mockData.products.map(p => ({ id: p.id })) };
  }
  return executeQuery("SELECT id FROM products", [], []).then((rows) => ({
    products: rows,
  }));
}

export async function getProductCount() {
  if (isMockMode || !getPool()) {
    return mockData.products.length;
  }
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM products",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProductCategories() {
  if (isMockMode || !getPool()) {
    const categoryMap = new Map();
    mockData.products.forEach(p => {
      if (p.categories) {
        p.categories.forEach(c => {
          categoryMap.set(c.id, c.name || mockData.categories.find(cat => cat.id === c.id)?.name || "");
        });
      }
    });
    const productCategories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
    return { productCategories };
  }

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
  if (isMockMode || !getPool()) {
    const sorted = [...mockData.projects].sort((a, b) => {
      const yearA = a.startYear || 0;
      const yearB = b.startYear || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.id.localeCompare(b.id);
    });
    const start = (page - 1) * perPage;
    const projects = sorted.slice(start, start + perPage).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      startYear: p.startYear || null,
      endYear: p.endYear || null,
      picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
      categories: p.categories || []
    }));
    return {
      projects,
      count: {
        aggregate: {
          count: mockData.projects.length,
        },
      },
    };
  }

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

export async function getProject(projectId) {
  if (isMockMode || !getPool()) {
    const p = mockData.projects.find(p => p.id === projectId);
    if (!p) return { project: null };
    return {
      project: {
        id: p.id,
        name: p.name,
        description: p.description || null,
        startYear: p.startYear || null,
        endYear: p.endYear || null,
        picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
        categories: p.categories || []
      }
    };
  }

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

export async function getProjectsByCategoryId(page = 1, perPage = 5, categoryId) {
  if (isMockMode || !getPool()) {
    const filtered = mockData.projects.filter(p => p.categories && p.categories.some(c => c.id === categoryId));
    const sorted = [...filtered].sort((a, b) => {
      const yearA = a.startYear || 0;
      const yearB = b.startYear || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.id.localeCompare(b.id);
    });
    const start = (page - 1) * perPage;
    const projects = sorted.slice(start, start + perPage).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      startYear: p.startYear || null,
      endYear: p.endYear || null,
      picture: p.picture ? { url: p.picture.url, width: p.picture.width, height: p.picture.height } : null,
      categories: p.categories || []
    }));
    return {
      projects,
      count: {
        aggregate: {
          count: filtered.length,
        },
      },
    };
  }

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
  if (isMockMode || !getPool()) {
    const filtered = mockData.projects.filter(p => p.categories && p.categories.some(c => c.id === categoryId));
    return filtered.length;
  }
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM project_categories WHERE category_id = $1",
    [categoryId],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProjectIds() {
  if (isMockMode || !getPool()) {
    return { projects: mockData.projects.map(p => ({ id: p.id })) };
  }
  return executeQuery("SELECT id FROM projects", [], []).then((rows) => ({
    projects: rows,
  }));
}

export async function getProjectCount() {
  if (isMockMode || !getPool()) {
    return mockData.projects.length;
  }
  const rows = await executeQuery(
    "SELECT COUNT(*)::int AS count FROM projects",
    [],
    [{ count: 0 }]
  );
  return rows[0]?.count ?? 0;
}

export async function getProjectCategories() {
  if (isMockMode || !getPool()) {
    const categoryMap = new Map();
    mockData.projects.forEach(p => {
      if (p.categories) {
        p.categories.forEach(c => {
          categoryMap.set(c.id, c.name || mockData.categories.find(cat => cat.id === c.id)?.name || "");
        });
      }
    });
    const projectCategories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
    return { projectCategories };
  }

  const rows = await executeQuery(
    `SELECT DISTINCT c.id, c.name 
     FROM categories c
     INNER JOIN project_categories pc ON c.id = pc.category_id`,
    [],
    []
  );
  return { projectCategories: rows };
}
