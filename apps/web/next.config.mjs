import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@distill/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withMDX(nextConfig);
