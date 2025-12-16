/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ctxopt/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/api/v1/proxy/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Anthropic-API-Key",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
