module.exports = {
  images: {
    domains: [
      "ap-northeast-1.graphassets.com",
      "media.graphcms.com",
      "media.graphassets.com",
    ],
  },
  async redirects() {
    return [
      {
        source: "/news/list",
        destination: "/news/list/1",
        permanent: false,
      },
      {
        source: "/projects/list",
        destination: "/projects/list/1",
        permanent: false,
      },
      {
        source: "/products/list",
        destination: "/products/list/1",
        permanent: false,
      },
    ];
  },
};
