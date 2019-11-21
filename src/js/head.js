import React from 'react'
import { Helmet } from 'react-helmet'

export const Head = ({ subtitle, description: myDescription }) => {
  const baseTitle = 'vdslab'
  const title = subtitle ? `${subtitle} - ${baseTitle}` : baseTitle
  const defaultDescription = `日本大学文理学部情報科学科 尾上研究室のWebサイトです。`
  const description = myDescription || defaultDescription
  const url = window.location.toString()
  return (
    <Helmet>
      <title>{title}</title>
      <meta name='description' content={description} />
      <meta name='twitter:card' content='summary' />
      <meta name='twitter:site' content='@_likr' />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description} />
      <meta property='og:title' content={title} />
      <meta property='og:type' content='blog' />
      <meta property='og:url' content={url} />
      <meta property='og:image' content='/images/media.png' />
      <meta property='og:site_name' content={baseTitle} />
      <meta property='og:description' content={description} />
    </Helmet>
  )
}
