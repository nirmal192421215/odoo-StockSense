import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevents Next.js from looking outside the repo root for package-lock.json
    root: __dirname,
  },
};

export default nextConfig;
