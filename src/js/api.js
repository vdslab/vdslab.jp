import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromPromise'

const request = (query) => {
  const options = {
    method: 'POST',
    body: JSON.stringify({ query }),
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
    projects(orderBy: startYear_DESC) {
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
    projects(where: {categories_some: {id: "${categoryId}"}}, orderBy: startYear_DESC) {
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
    projectCategories {
      id
      name
    }
  }`
  return request(query)
}

export const getNews = () => {
  const query = `{
    news: newses(orderBy: date_DESC, first: 5) {
      id
      title
      content
      date
    }
  }`
  return request(query)
}
