import "bulma/css/bulma.css";

import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import logoSvg from "../../public/images/logo.svg";

function TabLink({ children, exact, href,activePath }) {
  const router = useRouter();
  const match = exact
    ? router.pathname === href
    : router.pathname.startsWith(activePath);
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
                  <Image src={logoSvg} alt="vdslab website" />
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
                <TabLink href="/news/list" activePath="/news">News</TabLink>
                <TabLink href="/projects" activePath="/projects">Projects</TabLink>
                <TabLink href="/products/list" activePath="/products">Products</TabLink>
                <TabLink href="/members" activePath="/members">Members</TabLink>
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
