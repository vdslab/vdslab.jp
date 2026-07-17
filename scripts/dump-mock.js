const fs = require("fs");
const path = require("path");

const HYGRAPH_API =
  "https://ap-northeast-1.cdn.hygraph.com/content/ck1vrsd0c1mts019whoce6cox/master";

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

const ALL_DATA_QUERY = `
  query {
    categories(first: 1000) {
      id
      name
    }
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
    posts(first: 1000, stage: PUBLISHED) {
      id
      title
      content
      date
    }
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
        name
      }
    }
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
        name
      }
    }
  }
`;

async function main() {
  console.log("Fetching all data from Hygraph...");
  const data = await queryHygraph(ALL_DATA_QUERY);
  console.log("Fetched categories:", data.categories.length);
  console.log("Fetched members:", data.members.length);
  console.log("Fetched posts:", data.posts.length);
  console.log("Fetched products:", data.products.length);
  console.log("Fetched projects:", data.projects.length);

  const outDir = path.join(__dirname, "../src/data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outDir, "mockData.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );
  console.log("Mock data written successfully to src/data/mockData.json!");
}

main().catch((err) => {
  console.error("Failed to dump mock data:", err);
  process.exit(1);
});
