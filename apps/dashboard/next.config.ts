import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Bastion IS the image host — allow all since we control access
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Runtime config via env vars only (Next.js 16 removed serverRuntimeConfig)
  serverExternalPackages: ["sharp", "mongoose"],
};

export default nextConfig;
