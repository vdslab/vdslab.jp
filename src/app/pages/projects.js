import React from 'react'
import {
  Link
} from 'react-router-dom'
import {markdown} from 'markdown'
import {Head} from '../head'
import {
  getProjects,
  getProjectsByCategoryId,
  getProjectCategories
} from '../api'

const Category = ({category, large}) => {
  const className = large ? 'tag is-link is-medium' : 'tag is-link'
  return <Link
    className={className}
    style={{backgroundColor: 'rgb(47, 87, 89)'}}
    to={`/projects/${category.id}`}>
    {category.name}
  </Link>
}

const Project = ({project}) => <article className='media'>
  <figure className='media-left'>
    <p className='image'>
      <img src={project.picture.url} style={{maxWidth: '480px'}} />
    </p>
  </figure>
  <div className='media-content'>
    <div className='content'>
      <h3>{project.name}</h3>
      <div className='tags'>{
        project.categories.map((category) => <Category key={category.id} category={category} />)
      }</div>
      <p dangerouslySetInnerHTML={{__html: markdown.toHTML(project.description)}} />
    </div>
  </div>
</article>

export class Projects extends React.Component {
  constructor () {
    super()
    this.state = {
      projects: [],
      categories: []
    }
  }

  componentDidMount () {
    this.categoriesSubscription = getProjectCategories().subscribe(({data}) => {
      this.setState({
        categories: data.allProjectCategories
      })
    })
    this.projectsSubscription = getProjects().subscribe(({data}) => {
      this.setState({
        projects: data.allProjects
      })
    })
  }

  componentDidUpdate (prevProps) {
    const {category} = this.props.match.params
    if (category !== prevProps.match.params.category) {
      const observable = category ? getProjectsByCategoryId(category) : getProjects()
      this.projectsSubscription = observable.subscribe(({data}) => {
        this.setState({
          projects: data.allProjects
        })
      })
    }
  }

  componentWillUnmount () {
    this.categoriesSubscription.unsubscribe()
    this.projectsSubscription.unsubscribe()
  }

  render () {
    const {projects, categories} = this.state
    return <div>
      <Head subtitle='Projects' />
      <div className='tags'>{
        categories.map((category) => <Category key={category.id} category={category} large />)
      }</div>
      <div>{
        projects.map((project) => <Project key={project.id} project={project} />)
      }</div>
    </div>
  }
}
