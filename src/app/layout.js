import "bulma/css/bulma.css";
import Image from "next/image";
import logoSvg from "../../public/images/logo.svg";
import TabLink from "../components/tab-link";

export const metadata = {
  metadataBase: new URL("https://vdslab.jp"),
  title: {
    template: "%s - vdslab",
    default: "vdslab",
  },
  description: "日本大学文理学部情報科学科 尾上研究室のWebサイトです。",
  twitter: {
    card: "summary",
    site: "@_likr",
    title: "vdslab",
    description: "日本大学文理学部情報科学科 尾上研究室のWebサイトです。",
  },
  openGraph: {
    title: "vdslab",
    description: "日本大学文理学部情報科学科 尾上研究室のWebサイトです。",
    type: "website",
    url: "https://vdslab.jp",
    siteName: "vdslab",
    images: [
      {
        url: "/images/media.png",
      },
    ],
  },
  icons: {
    icon: "/images/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "rgb(47,87,89)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
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
                    <TabLink href="/news/list" activePath="/news">
                      News
                    </TabLink>
                    <TabLink href="/projects/list" activePath="/projects">
                      Projects
                    </TabLink>
                    <TabLink href="/products/list" activePath="/products">
                      Products
                    </TabLink>
                    <TabLink href="/members" activePath="/members">
                      Members
                    </TabLink>
                  </ul>
                </div>
              </nav>
            </div>
          </section>
          <section className="section">
            <div className="container">{children}</div>
          </section>
          <footer className="footer">
            <div className="container">
              <div className="content has-text-centered">
                <p>©️ {new Date().getFullYear()} Yosuke Onoue</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
