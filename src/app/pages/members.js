import React from 'react'
import {markdown} from 'markdown'
import {Head} from '../head'
import {getMembers} from '../api'

const Member = ({member}) => <article className='media'>
  <div className='tile is-ancestor'>
    <div className='tile is-vertical'>
      <div className='tile is-parent' style={{paddingBottom: 0}} >
        <div className='tile is-child' style={{paddingBottom: 0}} >
          <div className='column' style={{paddingBottom: 0}} >
            <h4 className='title is-4 is-inline'>
              {member.name}
            </h4>
            <p className='subtitle is-inline'>
              {member.title}
            </p>
          </div>
        </div>
      </div>
      <div className='tile is-parent'>
        <div className='tile is-child is-2'>
          <div className='column is-half-mobile is-offset-one-quarter-mobile'>
            <figure className='image'>
              <img src={member.picture.url} />
            </figure>
          </div>
        </div>
        <div className='tile is-child'>
          <div className='column'>
            <div className='content' dangerouslySetInnerHTML={{__html: markdown.toHTML(member.description)}} />
          </div>
        </div>
      </div>
    </div>
  </div>
</article>

export class Members extends React.Component {
  constructor () {
    super()
    this.state = {
      staffs: [],
      students: []
    }
  }

  componentDidMount () {
    this.staffsSubscription = getMembers().subscribe(({data}) => {
      this.setState({
        staffs: data.staffs,
        students: data.students
      })
    })
  }

  componentWillUnmount () {
    this.staffsSubscription.unsubscribe()
  }

  render () {
    const {staffs, students} = this.state

    return <div>
      <Head subtitle='Members' />
      <div className='columns'>
        <div className='column is-2'>
          <aside className='menu'>
            <p className='menu-label'>Members</p>
            <ul className='menu-list'>
              <li><a href='#staffs'>指導教員</a></li>
              <li><a href='#students'>学生</a></li>
            </ul>
          </aside>
        </div>
        <div className='column'>
          <h3 id='staffs' className='title'>指導教員</h3>
          <div>{
            staffs.map((member) => <Member key={member.id} member={member} />)
          }</div>
          <h3 id='students' className='title'>学生</h3>
          <div>{
            students.map((member) => <Member key={member.id} member={member} />)
          }</div>
        </div>
      </div>
    </div>
  }
}
