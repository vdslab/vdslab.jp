const { Client } = require("pg");

const HYGRAPH_API =
  "https://ap-northeast-1.cdn.hygraph.com/content/ck1vrsd0c1mts019whoce6cox/master";

/**
 * GraphQL API からデータを取得する共通関数
 * @param {string} query
 * @param {object} variables
 * @returns {Promise<object>}
 */
async function queryHygraph(query, variables = {}) {
  const response = await fetch(HYGRAPH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Hygraph API error: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

const CATEGORIES_QUERY = `
  query {
    categories(first: 1000) {
      id
      name
    }
  }
`;

const MEMBERS_QUERY = `
  query {
    members(first: 1000, stage: PUBLISHED) {
      id
      name
      title
      description
      picture {
        url
        height
        width
      }
      type
      order
      assignedYear
    }
  }
`;

const POSTS_QUERY = `
  query {
    posts(first: 1000, stage: PUBLISHED) {
      id
      title
      content
      date
    }
  }
`;

const PRODUCTS_QUERY = `
  query {
    products(first: 1000, stage: PUBLISHED) {
      id
      name
      description
      publishYear
      picture {
        url
        height
        width
      }
      categories {
        id
      }
    }
  }
`;

const PROJECTS_QUERY = `
  query {
    projects(first: 1000, stage: PUBLISHED) {
      id
      name
      description
      startYear
      endYear
      picture {
        url
        height
        width
      }
      categories {
        id
      }
    }
  }
`;

/**
 * 移行メイン処理
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL database...");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Successfully connected to database.");

    // トランザクションの開始
    await client.query("BEGIN");

    // 1. カテゴリーの移行
    console.log("Fetching categories from Hygraph...");
    const categoriesData = await queryHygraph(CATEGORIES_QUERY);
    console.log(
      `Fetched ${categoriesData.categories.length} categories. Migrating...`
    );

    for (const cat of categoriesData.categories) {
      await client.query(
        `INSERT INTO categories (id, name)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [cat.id, cat.name]
      );
    }

    // 2. メンバーの移行
    console.log("Fetching members from Hygraph...");
    const membersData = await queryHygraph(MEMBERS_QUERY);
    const validMemberTypes = [
      "Staff",
      "Student",
      "GraduateStudent",
      "GraduateStudentDoctor",
    ];
    const members = membersData.members.filter((m) =>
      validMemberTypes.includes(m.type)
    );
    console.log(
      `Fetched ${membersData.members.length} members (${members.length} valid). Migrating...`
    );

    for (const m of members) {
      const pictureUrl = m.picture ? m.picture.url : null;
      const pictureWidth = m.picture ? m.picture.width : null;
      const pictureHeight = m.picture ? m.picture.height : null;

      await client.query(
        `INSERT INTO members (id, name, title, description, picture_url, picture_width, picture_height, type, "order", assigned_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           picture_url = EXCLUDED.picture_url,
           picture_width = EXCLUDED.picture_width,
           picture_height = EXCLUDED.picture_height,
           type = EXCLUDED.type,
           "order" = EXCLUDED."order",
           assigned_year = EXCLUDED.assigned_year`,
        [
          m.id,
          m.name,
          m.title || null,
          m.description || null,
          pictureUrl,
          pictureWidth,
          pictureHeight,
          m.type,
          m.order !== undefined && m.order !== null ? m.order : 0,
          m.assignedYear || null,
        ]
      );
    }

    // 3. ニュース (posts) の移行
    console.log("Fetching posts from Hygraph...");
    const postsData = await queryHygraph(POSTS_QUERY);
    console.log(`Fetched ${postsData.posts.length} posts. Migrating...`);

    for (const post of postsData.posts) {
      await client.query(
        `INSERT INTO posts (id, title, content, date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           date = EXCLUDED.date`,
        [post.id, post.title, post.content || null, post.date]
      );
    }

    // 4. プロダクト (products) の移行
    console.log("Fetching products from Hygraph...");
    const productsData = await queryHygraph(PRODUCTS_QUERY);
    console.log(`Fetched ${productsData.products.length} products. Migrating...`);

    for (const prod of productsData.products) {
      const pictureUrl = prod.picture ? prod.picture.url : null;
      const pictureWidth = prod.picture ? prod.picture.width : null;
      const pictureHeight = prod.picture ? prod.picture.height : null;

      await client.query(
        `INSERT INTO products (id, name, description, publish_year, picture_url, picture_width, picture_height)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           publish_year = EXCLUDED.publish_year,
           picture_url = EXCLUDED.picture_url,
           picture_width = EXCLUDED.picture_width,
           picture_height = EXCLUDED.picture_height`,
        [
          prod.id,
          prod.name,
          prod.description || null,
          prod.publishYear,
          pictureUrl,
          pictureWidth,
          pictureHeight,
        ]
      );

      // 中間テーブル product_categories の更新
      await client.query(
        "DELETE FROM product_categories WHERE product_id = $1",
        [prod.id]
      );

      if (prod.categories && prod.categories.length > 0) {
        for (const cat of prod.categories) {
          await client.query(
            `INSERT INTO product_categories (product_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT (product_id, category_id) DO NOTHING`,
            [prod.id, cat.id]
          );
        }
      }
    }

    // 5. プロジェクト (projects) の移行
    console.log("Fetching projects from Hygraph...");
    const projectsData = await queryHygraph(PROJECTS_QUERY);
    console.log(`Fetched ${projectsData.projects.length} projects. Migrating...`);

    for (const proj of projectsData.projects) {
      const pictureUrl = proj.picture ? proj.picture.url : null;
      const pictureWidth = proj.picture ? proj.picture.width : null;
      const pictureHeight = proj.picture ? proj.picture.height : null;

      await client.query(
        `INSERT INTO projects (id, name, description, start_year, end_year, picture_url, picture_width, picture_height)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           start_year = EXCLUDED.start_year,
           end_year = EXCLUDED.end_year,
           picture_url = EXCLUDED.picture_url,
           picture_width = EXCLUDED.picture_width,
           picture_height = EXCLUDED.picture_height`,
        [
          proj.id,
          proj.name,
          proj.description || null,
          proj.startYear,
          proj.endYear || null,
          pictureUrl,
          pictureWidth,
          pictureHeight,
        ]
      );

      // 中間テーブル project_categories の更新
      await client.query(
        "DELETE FROM project_categories WHERE project_id = $1",
        [proj.id]
      );

      if (proj.categories && proj.categories.length > 0) {
        for (const cat of proj.categories) {
          await client.query(
            `INSERT INTO project_categories (project_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT (project_id, category_id) DO NOTHING`,
            [proj.id, cat.id]
          );
        }
      }
    }

    // コミット
    await client.query("COMMIT");
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error occurred during migration. Rolling back...");
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
