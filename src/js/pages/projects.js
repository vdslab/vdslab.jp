import React from 'react'
import { Link } from 'react-router-dom'
import { toHTML } from '../markdown'
import { Head } from '../head'
import {
  getProjects,
  getProjectsByCategoryId,
  getProjectCategories
} from '../api'

const Category = ({ category, large }) => {
  const className = large ? 'tag is-link is-medium' : 'tag is-link'
  return (
    <Link
      className={className}
      style={{ backgroundColor: 'rgb(47, 87, 89)' }}
      to={`/projects/${category.id}`}
    >
      {category.name}
    </Link>
  )
}

const Project = ({ project }) => (
  <article className='media'>
    <div className='columns'>
      <div className='column'>
        <h3 className='title'>{project.name}</h3>
        <div className='tags'>
          {project.categories.map((category) => (
            <Category key={category.id} category={category} />
          ))}
        </div>
        <div
          className='content'
          dangerouslySetInnerHTML={{
            __html: toHTML(project.description)
          }}
        />
      </div>
      <div className='column'>
        <figure className='image'>
          <img src={project.picture.url} />
        </figure>
      </div>
    </div>
  </article>
)

export class Projects extends React.Component {
  constructor() {
    super()
    this.state = {
      projects: [],
      categories: []
    }
  }

  componentDidMount() {
    this.categoriesSubscription = getProjectCategories().subscribe(
      ({ categories }) => {
        this.setState({ categories })
      }
    )
    this.projectsSubscription = getProjects().subscribe(({ projects }) => {
      this.setState({ projects })
    })
  }

  componentDidUpdate(prevProps) {
    const { category } = this.props.match.params
    if (category !== prevProps.match.params.category) {
      const observable = category
        ? getProjectsByCategoryId(category)
        : getProjects()
      this.projectsSubscription = observable.subscribe(({ projects }) => {
        this.setState({ projects })
      })
    }
  }

  componentWillUnmount() {
    this.categoriesSubscription.unsubscribe()
    this.projectsSubscription.unsubscribe()
  }

  render() {
    const { projects, categories } = this.state
    return (
      <div>
        <Head subtitle='Projects' />
        <div className='tags'>
          {categories.map((category) => (
            <Category key={category.id} category={category} large />
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
}
