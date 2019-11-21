import React from 'react'
import { toHTML } from '../markdown'
import { Head } from '../head'
import { getMembers } from '../api'

const groupStudents = (members) => {
  const years = Array.from(
    new Set(members.map((member) => member.assignedYear))
  )
  years.sort()
  return years.map((year) => {
    const yearMembers = members.filter((member) => member.assignedYear === year)
    yearMembers.sort((m1, m2) => m1.order - m2.order)
    return {
      year,
      members: yearMembers
    }
  })
}

const Staff = ({ member }) => (
  <article className='media'>
    <div className='tile is-ancestor'>
      <div className='tile is-vertical'>
        <div className='tile is-parent' style={{ paddingBottom: 0 }}>
          <div className='tile is-child' style={{ paddingBottom: 0 }}>
            <div className='column' style={{ paddingBottom: 0 }}>
              <h4 className='title is-4 is-inline'>{member.name}</h4>
              &nbsp;
              <p className='subtitle is-inline'>{member.title}</p>
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
              <div
                className='content'
                dangerouslySetInnerHTML={{
                  __html: toHTML(member.description)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
)

const Student = ({ member }) => (
  <article className='media'>
    <div className='tile is-ancestor'>
      <div className='tile is-vertical'>
        <div className='tile is-parent' style={{ paddingBottom: 0 }}>
          <div className='tile is-child' style={{ paddingBottom: 0 }}>
            <div className='column' style={{ paddingBottom: 0 }}>
              <h4 className='title is-4 is-inline'>{member.name}</h4>
              &nbsp;
              <p className='subtitle is-inline'>{member.title}</p>
            </div>
          </div>
        </div>
        <div className='tile is-parent'>
          <div className='tile is-child'>
            <div className='column'>
              <div
                className='content'
                dangerouslySetInnerHTML={{
                  __html: toHTML(member.description)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
)

export class Members extends React.Component {
  constructor() {
    super()
    this.state = {
      staffs: [],
      students: []
    }
  }

  componentDidMount() {
    this.membersSubscription = getMembers().subscribe(
      ({ staffs, students }) => {
        this.setState({
          staffs,
          students: groupStudents(students)
        })
      }
    )
  }

  componentWillUnmount() {
    this.membersSubscription.unsubscribe()
  }

  render() {
    const { staffs, students } = this.state

    return (
      <div>
        <Head subtitle='Members' />
        <div className='columns'>
          <div className='column is-2'>
            <aside className='menu'>
              <p className='menu-label'>Members</p>
              <ul className='menu-list'>
                <li>
                  <a href='#staffs'>指導教員</a>
                </li>
                <li>
                  <a href='#students'>学生</a>
                  <ul>
                    {students.map(({ year }) => (
                      <li key={year}>
                        <a href={`#students-${year}`}>{year}年配属</a>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </aside>
          </div>
          <div className='column'>
            <h3 id='staffs' className='title'>
              指導教員
            </h3>
            <div>
              {staffs.map((member) => (
                <Staff key={member.id} member={member} />
              ))}
            </div>
            <h3 id='students' className='title'>
              学生
            </h3>
            <div>
              {students.map(({ year, members }) => {
                return (
                  <div id={`students-${year}`} key={year}>
                    <h4>{year}年配属</h4>
                    <div>
                      {members.map((member) => (
                        <Student key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
