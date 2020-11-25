import "bulma/css/bulma.css";
import logoPath from "../images/logo.svg";
import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { Top } from "./pages/top";
import { Members } from "./pages/members";
import News from "./pages/news";
import NewsDetail from "./pages/news-detail";
import Products from "./pages/products";
import Projects from "./pages/projects";

if ("serviceWorker" in navigator) {
  const swName = "/sw.js";
  navigator.serviceWorker
    .register(swName)
    .then((reg) => {
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          switch (installingWorker.state) {
            case "installed":
              if (navigator.serviceWorker.controller) {
                console.log("New or updated content is available.");
              } else {
                console.log("Content is now available offline!");
              }
              break;
            case "redundant":
              console.error("The installing service worker became redundant.");
              break;
          }
        };
      };
    })
    .catch((e) => {
      console.error("Error during service worker registration:", e);
    });
}

const TabLink = ({ to, children, exact }) => (
  <Route
    path={to}
    exact={exact}
    children={({ match }) => {
      return (
        <li className={match ? "is-active" : ""}>
          <Link to={to} style={{ color: match ? "rgb(32,88,90)" : "white" }}>
            {children}
          </Link>
        </li>
      );
    }}
  />
);

const Root = () => (
  <Router>
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
                  <img src={logoPath} alt="vdslab website" />
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
                <TabLink to="/" exact>
                  Top
                </TabLink>
                <TabLink to="/news">News</TabLink>
                <TabLink to="/projects">Projects</TabLink>
                <TabLink to="/products">Products</TabLink>
                <TabLink to="/members">Members</TabLink>
              </ul>
            </div>
          </nav>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Route path="/" exact component={Top} />
          <Route path="/news" exact component={News} />
          <Route path="/news/:postId" component={NewsDetail} />
          <Route path="/projects" exact component={Projects} />
          <Route path="/products" exact component={Products} />
          <Route path="/members" exact component={Members} />
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
  </Router>
);

render(<Root />, document.getElementById("content"));
