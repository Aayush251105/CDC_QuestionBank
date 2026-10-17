import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // forbidden() for the 403 page in requireRole()
    authInterrupts: true,
    // One downscaled photo per request in S3 (default limit is 1 MB;
    // Vercel allows up to 4.5 MB per request).
    serverActions: { bodySizeLimit: "5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
