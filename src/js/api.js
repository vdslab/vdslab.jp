import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromPromise'

const request = (query, variables = {}) => {
  const options = {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
  const promise = window
    .fetch(
      'https://api-apeast.graphcms.com/v1/ck1vrsd0c1mts019whoce6cox/master',
      options
    )
    .then((response) => response.json())
    .then(({ data }) => data)
  return Observable.fromPromise(promise)
}

export const getMembers = () => {
  const query = `{
    staffs: members (where: {type: Staff}, orderBy: order_ASC) {
      id, name, title, description, picture {
        url
      }
    }
    students: members (where: {type: Student}) {
      id, name, title, description, order, assignedYear
    }
  }`
  return request(query)
}

export const getProjects = () => {
  const query = `{
    projects: projects(orderBy: startYear_DESC) {
      id
      name
      description
      picture {
        url
      }
      categories {
        id
        name
      }
    }
  }`
  return request(query)
}

export const getProjectsByCategoryId = (categoryId) => {
  const query = `{
    projects: projects(where: {categories_some: {id: "${categoryId}"}}, orderBy: startYear_DESC) {
      id
      name
      description
      picture {
        url
      }
      categories {
        id
        name
      }
    }
  }`
  return request(query)
}

export const getProjectCategories = () => {
  const query = `{
    categories: categories {
      id
      name
    }
  }`
  return request(query)
}

export const getPosts = (page = 1, perPage = 5) => {
  const skip = (page - 1) * perPage
  const query = `query($perPage:Int!, $skip:Int!) {
  posts: posts(orderBy: date_DESC, first: $perPage, skip: $skip) {
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
}`
  return request(query, {
    perPage,
    skip
  })
}

export const getPost = (postId) => {
  const query = `query($postId:ID!) {
  post: post(where: { id: $postId }) {
    id
    title
    content
    date
  }
}`
  return request(query, { postId })
}
