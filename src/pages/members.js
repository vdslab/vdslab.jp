import Image from "next/image";
import { getMembers } from "../api";
import Head from "../components/head";
import { toHTML } from "../markdown";


const getAssignedYear = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const april = 4;
  return month < april ? year - 1 : year;
}

const latestAssignedYear = getAssignedYear();

const groupStudents = (members) => {
  const years = Array.from(
    new Set(members.map((member) => member.assignedYear))
  );
  years.sort();
  years.reverse();
  return years.map((year) => {
    const yearMembers = members.filter(
      (member) => member.assignedYear === year
    );
    yearMembers.sort((m1, m2) => m1.order - m2.order);
    return {
      year,
      members: yearMembers,
    };
  });
};

const getOBs = (members) => {
  const OBs = members.filter((member) => {
    return latestAssignedYear - member.year >= 2;
  });
  return OBs;
};

const getUndergraduates = (membars) => {
  const undergraduates = membars.filter((member) => {
    return latestAssignedYear - member.year < 2;
  });
  return undergraduates;
};

const Staff = ({ member }) => (
  <article className="media">
    <div className="tile is-ancestor">
      <div className="tile is-vertical">
        <div className="tile is-parent" style={{ paddingBottom: 0 }}>
          <div className="tile is-child" style={{ paddingBottom: 0 }}>
            <div className="column" style={{ paddingBottom: 0 }}>
              <h4 className="title is-4 is-inline">{member.name}</h4>
              &nbsp;
              <p className="subtitle is-inline">{member.title}</p>
            </div>
          </div>
        </div>
        <div className="tile is-parent">
          <div className="tile is-child is-2">
            <div className="column is-half-mobile is-offset-one-quarter-mobile">
              <figure className="image">
                <Image
                  src={member.picture.url}
                  alt={member.name}
                  width={member.picture.width}
                  height={member.picture.height}
                />
              </figure>
            </div>
          </div>
          <div className="tile is-child">
            <div className="column">
              <div
                className="content"
                dangerouslySetInnerHTML={{
                  __html: toHTML(member.description),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
);

const Student = ({ member }) => (
  <article className="media">
    <div className="tile is-ancestor">
      <div className="tile is-vertical">
        <div className="tile is-parent" style={{ paddingBottom: 0 }}>
          <div className="tile is-child" style={{ paddingBottom: 0 }}>
            <div className="column" style={{ paddingBottom: 0 }}>
              <h4 className="title is-4 is-inline">{member.name}</h4>
              &nbsp;
              <p className="subtitle is-inline">{member.title}</p>
            </div>
          </div>
        </div>
        <div className="tile is-parent">
          <div className="tile is-child">
            <div className="column">
              <div
                className="content"
                dangerouslySetInnerHTML={{
                  __html: toHTML(member.description),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
);



export function MembersPage({ staffs, students, graduateStudent }) {
  const undergraduates = getUndergraduates(students);
  const OBs = getOBs(students);

  return (
    <div>
      <Head subtitle="Members" />
      <div className="columns">
        <div className="column is-2">
          <aside className="menu" style={{ position: "sticky", top: "48px" }}>
            <p className="menu-label">Members</p>
            <ul className="menu-list">
              <li>
                <a href="#staffs">指導教員</a>
              </li>
              <li>
                <a href="#students">学生</a>
                <ul>
                  {students.map(({ year }) => (
                    <li key={year}>
                      <a href={`#students-${year}`}>{year}年配属</a>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <a href="#graduateStudents">院生</a>
                <ul>
                  {graduateStudent.map(({ year }) => (
                    <li key={year}>
                      <a href={`#graduateStudents-${year}`}>{year}年配属</a>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </aside>
        </div>
        <div className="column">
          <h3 id="staffs" className="title">
            指導教員
          </h3>
          <div>
            {staffs.map((member) => (
              <Staff key={member.id} member={member} />
            ))}
          </div>
          <h3 id="students" className="title">
            学生
          </h3>
          <div>
            {undergraduates.map(({ year, members }) => {
              return (
                <div id={`students-${year}`} key={year}>
                  <h4>{year}年配属</h4>
                  <div>
                    {members.map((member) => (
                      <Student key={member.id} member={member} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <h3 id="OBs" className="title">
            OB
          </h3>
          <div>
            {OBs.map(({ year, members }) => {
              return (
                <div id={`students-${year}`} key={year}>
                  <h4>{year}年配属</h4>
                  <div>
                    {members.map((member) => (
                      <Student key={member.id} member={member} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <h3 id="graduateStudents" className="title">
            院生
          </h3>
          <div>
            {graduateStudent.map(({ year, members }) => {
              return (
                <div id={`graduateStudents-${year}`} key={year}>
                  <h4>{year}年配属</h4>
                  <div>
                    {members.map((member) => (
                      <Student key={member.id} member={member} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  const { staffs, students, graduateStudent } = await getMembers();
  return {
    props: { staffs, students: groupStudents(students), graduateStudent: groupStudents(graduateStudent) },
  };
}

export default MembersPage;
