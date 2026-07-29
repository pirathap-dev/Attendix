import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment, but disable it on Vercel
  output: process.env.VERCEL ? undefined : "standalone",

  // Prevent webpack from bundling pdfkit and failing on its native dependencies
  serverExternalPackages: ["pdfkit"],

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ]
  },
}

export default nextConfig
