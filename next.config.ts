import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the app to be embedded in a physical table display (no frame restrictions in dev)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
