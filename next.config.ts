import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    skipMiddlewareUrlNormalize: true,
  },
};

export default nextConfig;
