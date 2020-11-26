import NextHead from "next/head";
import { useRouter } from "next/router";

function Head({ subtitle, description: myDescription }) {
  const router = useRouter();
  const baseTitle = "vdslab";
  const title = subtitle ? `${subtitle} - ${baseTitle}` : baseTitle;
  const defaultDescription = `日本大学文理学部情報科学科 尾上研究室のWebサイトです。`;
  const description = myDescription || defaultDescription;
  const url = `https://vdslab.jp${router.asPath}`;
  return (
    <NextHead>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="rgb(47,87,89)" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@_likr" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:type" content="blog" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content="/images/media.png" />
      <meta property="og:site_name" content={baseTitle} />
      <meta property="og:description" content={description} />
      <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
      <link rel="manifest" href="/manifest.webmanifest" />
    </NextHead>
  );
}

export default Head;
