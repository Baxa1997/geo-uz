import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** Where the Python backend is. The browser never calls it directly: see `rewrites` below. */
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // The browser calls the backend through this site ("/api/backend/…"), so the login cookie belongs to the
  // site the user is on, whatever its domain (a Vercel address today, the product's own later). A cookie set
  // by another site's API is not sent back by browsers.
  rewrites: async () => [{ source: "/api/backend/:path*", destination: `${BACKEND}/:path*` }],
  experimental: {
    // Needed for a custom 404 because the root layout is app/[locale]/layout.tsx
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
