import {Observable} from 'rxjs/Observable'
import 'rxjs/add/observable/fromPromise'

const request = (query) => {
  const options = {
    method: 'POST',
    body: JSON.stringify({query}),
    headers: {
      'Content-Type': 'application/json'
    }
  }
  const promise = window.fetch('https://api.graphcms.com/simple/v1/cje3n0xx2187j0196bfwbdyge', options)
    .then((response) => response.json())
  return Observable.fromPromise(promise)
}

export const getStaffs = () => {
  const query = `{
    allMembers (filter: {type: Staff}, orderBy: order_ASC) {
      id, name, title, description, picture {
        url
      }
    }
  }`
  return request(query)
}

export const getProjects = () => {
  const query = `{
    allProjects(orderBy: startYear_DESC) {
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
    allProjects(filter: {categories_some: {id: "${categoryId}"}}, orderBy: startYear_DESC) {
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
    allProjectCategories {
      id
      name
    }
  }`
  return request(query)
}
