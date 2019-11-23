import React from 'react'
import { Link } from 'react-router-dom'

const CategoryTag = ({ category, large, to }) => {
  const className = large ? 'tag is-link is-medium' : 'tag is-link'
  return (
    <Link
      className={className}
      style={{ backgroundColor: 'rgb(47, 87, 89)' }}
      to={to}
    >
      {category.name}
    </Link>
  )
}

export default CategoryTag
