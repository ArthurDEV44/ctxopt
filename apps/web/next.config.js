/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ctxopt/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
