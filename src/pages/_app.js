import "bulma/css/bulma.css";

import Link from "next/link";
import { useRouter } from "next/router";

function TabLink({ children, exact, href }) {
  const router = useRouter();
  const match = exact
    ? router.pathname === href
    : router.pathname.startsWith(href);
  return (
    <li className={match ? "is-active" : ""}>
      <Link href={href}>
        <a style={{ color: match ? "rgb(32,88,90)" : "white" }}>{children}</a>
      </Link>
    </li>
  );
}

function App({ Component, pageProps }) {
  return (
    <div>
      <section
        className="hero is-primary is-bold"
        style={{ backgroundColor: "rgb(32,88,90)", backgroundImage: "none" }}
      >
        <div className="hero-body">
          <div className="container has-text-centered">
            <div className="column is-half-desktop is-offset-one-quarter-desktop">
              <h1 className="title">
                <figure className="image">
                  <img src="/images/logo.svg" alt="vdslab website" />
                </figure>
              </h1>
              <h2 className="subtitle">
                日本大学文理学部情報科学科 <br className="is-hidden-tablet" />{" "}
                尾上研究室
              </h2>
            </div>
          </div>
        </div>
        <div className="hero-foot">
          <nav className="tabs is-boxed is-fullwidth">
            <div className="container">
              <ul>
                <TabLink href="/" exact>
                  Top
                </TabLink>
                <TabLink href="/news/list">News</TabLink>
                <TabLink href="/projects">Projects</TabLink>
                <TabLink href="/products">Products</TabLink>
                <TabLink href="/members">Members</TabLink>
              </ul>
            </div>
          </nav>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Component {...pageProps} />
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <div className="content has-text-centered">
            <p>©️ 2018 Yosuke Onoue</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
