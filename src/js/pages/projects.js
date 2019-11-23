import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toHTML } from '../markdown'
import { Head } from '../head'
import CategoryTag from '../components/category-tag'
import { getCategories, getProjects, getProjectsByCategoryId } from '../api'

const Project = ({ project }) => (
  <article className='media'>
    <div className='columns'>
      <div className='column'>
        <h3 className='title'>{project.name}</h3>
        <div className='tags'>
          {project.categories.map((category) => (
            <CategoryTag
              key={category.id}
              category={category}
              to={`/projects?category=${category.id}`}
            />
          ))}
        </div>
        <div
          className='content'
          dangerouslySetInnerHTML={{
            __html: toHTML(project.description)
          }}
        />
      </div>
      {project.picture && (
        <div className='column'>
          <figure className='image'>
            <img src={project.picture.url} />
          </figure>
        </div>
      )}
    </div>
  </article>
)

const Projects = () => {
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])

  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const category = params.get('category')

  useEffect(() => {
    const categoriesSubscription = getCategories().subscribe(
      ({ categories }) => {
        setCategories(categories)
      }
    )
    return () => {
      categoriesSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const observable = category
      ? getProjectsByCategoryId(category)
      : getProjects()
    const projectsSubscription = observable.subscribe(({ projects }) => {
      setProjects(projects)
    })
    return () => {
      projectsSubscription.unsubscribe()
    }
  }, [category])

  return (
    <div>
      <Head subtitle='Projects' />
      <div className='tags'>
        {categories.map((category) => (
          <CategoryTag
            key={category.id}
            category={category}
            large
            to={`/projects?category=${category.id}`}
          />
        ))}
      </div>
      <div>
        {projects.map((project) => (
          <Project key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

export default Projects
