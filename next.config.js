const { ALLOWED_IMAGE_DOMAINS } = require("./src/config/images");

module.exports = {
  images: {
    domains: ALLOWED_IMAGE_DOMAINS,
  },
  experimental: {
    serverComponentsExternalPackages: ["@modelcontextprotocol/sdk"],
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
