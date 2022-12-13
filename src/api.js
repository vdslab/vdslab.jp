function request(query, variables = {}) {
  const options = {
    method: "POST",
    body: JSON.stringify({ query, variables }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  return fetch(
    "https://api-ap-northeast-1.graphcms.com/v2/ck1vrsd0c1mts019whoce6cox/master",
    options
  )
    .then((response) => response.json())
    .then(({ data }) => data);
}

export function getCategories() {
  const query = `{
  categories: categories {
    id
    name
  }
}`;
  return request(query);
}

export function getMembers() {
  const query = `{
  staffs: members (stage: PUBLISHED, where: {type: Staff}, orderBy: order_ASC) {
    id, name, title, description, picture {
      url
      height
      width
    }
  }
  students: members (stage: PUBLISHED, where: {type: Student}) {
    id, name, title, description, order, assignedYear
  }
  graduateStudent: members (stage: PUBLISHED, where: {type: GraduateStudent}) {
    id, name, title, description, order, assignedYear
  }
}`;
  return request(query);
}

export function getPost(postId) {
  const query = `query($postId:ID!) {
  post: post(where: { id: $postId }) {
    id
    title
    content
    date
  }
}`;
  return request(query, { postId });
}

export async function getPostCount() {
  const query = `{
  postsConnection {
    aggregate {
      count
    }
  }
}`;
  const response = await request(query);
  return response.postsConnection.aggregate.count;
}

export function getPosts(page = 1, perPage = 5) {
  const skip = (page - 1) * perPage;
  const query = `query($perPage:Int!, $skip:Int!) {
  posts: posts(stage: PUBLISHED, orderBy: date_DESC, first: $perPage, skip: $skip) {
    id
    title
    content
    date
  }
  count: postsConnection {
    aggregate {
      count
    }
  }
}`;
  return request(query, {
    perPage,
    skip,
  });
}

export function getPostIds() {
  const query = `{
  posts {
    id
  }
}`;
  return request(query);
}

export function getProducts(page = 1, perPage = 5) {
  const skip = (page - 1) * perPage;
  const query = `query($perPage:Int!, $skip:Int!) {
  products: products(stage: PUBLISHED, orderBy: publishYear_DESC, first: $perPage, skip: $skip) {
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
  count: productsConnection {
    aggregate {
      count
    }
  }
}`;
  return request(query, {
    perPage,
    skip,
  });
}

export function getProduct(productId) {
  const query = `query($productId:ID!) {
    product: product(where: { id: $productId}) {
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
  }`;
  return request(query, { productId });
}

export function getProductsByCategoryId(page = 1, perPage = 5, categoryId) {
  const skip = (page - 1) * perPage;
  const query = `query($perPage:Int!, $skip:Int!, $categoryId:ID!) {
      products: products(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}, orderBy: publishYear_DESC, first: $perPage, skip: $skip) {
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
      count: productsConnection(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}) {
        aggregate {
          count
        }
      }
    }`;
  return request(query, { perPage, skip, categoryId });
}

export async function getProductCountByCategoryId(categoryId) {
  const query = `query($categoryId:ID!) {
    count: productsConnection(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}) {
      aggregate {
        count
      }
    }
  }`;
  const response = await request(query, { categoryId });
  return response.count.aggregate.count;
}

export function getProductIds() {
  const query = `{
    products {
      id
    }
  }`;
  return request(query);
}

export async function getProductCount() {
  const query = `{
    productsConnection {
      aggregate {
        count
      }
    }
  }`;
  const response = await request(query);
  return response.productsConnection.aggregate.count;
}

export async function getProductCategories() {
  const query = `{
    productCategoryArray: products(stage: PUBLISHED){
      categories {
        id
        name
      }
    }
  }`;
  const { productCategoryArray } = await request(query);
  const productCategoryMap = new Map();
  productCategoryArray.forEach((product) => {
    product.categories.forEach((category) => {
      productCategoryMap.set(category.id, category.name);
    });
  });
  const productCategories = [];
  productCategoryMap.forEach((name, id) => {
    productCategories.push({ id: id, name: name });
  });
  return { productCategories };
}

export function getProjects(page = 1, perPage = 5) {
  const skip = (page - 1) * perPage;
  const query = `query($perPage:Int!, $skip:Int!) {
    projects: projects(stage: PUBLISHED, orderBy: startYear_DESC, first: $perPage, skip: $skip) {
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
    count: projectsConnection {
      aggregate {
        count
      }
    }
  }`;
  return request(query, {
    perPage,
    skip,
  });
}

export function getProject(projectId) {
  const query = `query($projectId:ID!) {
    project: project(where: { id: $projectId }) {
      id
      name
      description
      startYear
      endYear
      picture {
        url
      }
      categories {
        id
        name
      }
    }
  }`;
  return request(query, { projectId });
}

export function getProjectsByCategoryId(page = 1, perPage = 5, categoryId) {
  const skip = (page - 1) * perPage;
  const query = `query($perPage:Int!, $skip:Int!, $categoryId:ID!) {
    projects: projects(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}, orderBy: startYear_DESC, first: $perPage, skip: $skip) {
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
    count: projectsConnection(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}) {
      aggregate {
        count
      }
    }
  }`;
  return request(query, { perPage, skip, categoryId });
}

export async function getProjectCountByCategoryId(categoryId) {
  const query = `query($categoryId:ID!) {
    count: projectsConnection(stage: PUBLISHED, where: {categories_some: {id: $categoryId}}) {
      aggregate {
        count
      }
    }
  }`;
  const response = await request(query, { categoryId });
  return response.count.aggregate.count;
}

export function getProjectIds() {
  const query = `{
    projects {
      id
    }
  }`;
  return request(query);
}

export async function getProjectCount() {
  const query = `{
    projectsConnection {
      aggregate {
        count
      }
    }
  }`;
  const response = await request(query);
  return response.projectsConnection.aggregate.count;
}

export async function getProjectCategories() {
  const query = `{
    projectCategoryArray: projects(stage: PUBLISHED) {
      categories {
        id
        name
      }
    }
  }`;
  const { projectCategoryArray } = await request(query);
  const projectCategoryMap = new Map();
  projectCategoryArray.forEach((project) => {
    project.categories.forEach((category) => {
      projectCategoryMap.set(category.id, category.name);
    });
  });
  const projectCategories = [];
  projectCategoryMap.forEach((name, id) => {
    projectCategories.push({ id: id, name: name });
  });
  return { projectCategories };
}
