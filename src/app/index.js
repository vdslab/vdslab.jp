import React from 'react'
import {render} from 'react-dom'
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom'
import {Top} from './pages/top'
import {Projects} from './pages/projects'
import {Members} from './pages/members'

const TabLink = ({to, children, exact}) => <Route
  path={to}
  exact={exact}
  children={({match}) => {
    return <li className={match ? 'is-active' : ''}>
      <Link to={to} style={{color: match ? 'rgb(47,87,89)' : 'white'}}>{children}</Link>
    </li>
  }}
/>

const Root = () => <Router>
  <div>
    <section className='hero is-primary is-bold' style={{backgroundColor: 'rgb(47,87,89)', backgroundImage: 'none'}}>
      <div className='hero-body'>
        <div className='container has-text-centered'>
          <h1 className='title'>
            <img src='/images/logo.svg' alt='vdslab website' style={{height: '180px'}} />
          </h1>
          <h2 className='subtitle'>
            日本大学文理学部情報科学科 尾上研究室
          </h2>
        </div>
      </div>
      <div className='hero-foot'>
        <nav className='tabs is-boxed is-fullwidth'>
          <div className='container'>
            <ul>
              <TabLink to='/' exact>Top</TabLink>
              <TabLink to='/projects'>Projects</TabLink>
              <TabLink to='/members'>Members</TabLink>
            </ul>
          </div>
        </nav>
      </div>
    </section>
    <section className='section'>
      <div className='container'>
        <Route path='/' exact component={Top} />
        <Route path='/projects/:category?' exact component={Projects} />
        <Route path='/members' exact component={Members} />
      </div>
    </section>
    <footer className='footer'>
      <div className='container'>
        <div className='content has-text-centered'>
          <p>©️ 2018 Yosuke Onoue</p>
        </div>
      </div>
    </footer>
  </div>
</Router>

render(<Root />, document.getElementById('content'))
