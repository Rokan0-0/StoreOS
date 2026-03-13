import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        // Cache all app navigation pages — NetworkFirst so they work offline
        urlPattern: /^https:\/\/store-os-pi\.vercel\.app\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "storeos-pages",
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 }, // 24h
          networkTimeoutSeconds: 3,
        },
      },
      {
        // Cache static assets aggressively — CacheFirst is safe for hashed files
        urlPattern: /\.(?:js|css|woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "storeos-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }, // 30 days
        },
      },
      {
        // Never cache Supabase API calls — always needs live auth tokens
        urlPattern: /supabase\.co/,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
