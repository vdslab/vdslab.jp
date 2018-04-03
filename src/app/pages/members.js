import React from 'react'
import {markdown} from 'markdown'
import {Head} from '../head'
import {getStaffs} from '../api'

const Member = ({member}) => <article className='media'>
  <figure className='media-left'>
    <p className='image is-128x128'>
      <img src={member.picture.url} />
    </p>
  </figure>
  <div className='media-content'>
    <div className='content'>
      <p>
        <strong>{member.name}</strong> <small>{member.title}</small>
      </p>
      <p dangerouslySetInnerHTML={{__html: markdown.toHTML(member.description)}} />
    </div>
  </div>
</article>

export class Members extends React.Component {
  constructor () {
    super()
    this.state = {
      staffs: []
    }
  }

  componentDidMount () {
    this.staffsSubscription = getStaffs().subscribe(({data}) => {
      this.setState({
        staffs: data.allMembers
      })
    })
  }

  componentWillUnmount () {
    this.staffsSubscription.unsubscribe()
  }

  render () {
    const {staffs} = this.state
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
          <div className='content'>
            <h3 id='staffs'>指導教員</h3>
            <div>{
              staffs.map((member) => <Member key={member.id} member={member} />)
            }</div>
            <h3 id='students'>学生</h3>
            <p>準備中</p>
          </div>
        </div>
      </div>
    </div>
  }
}
