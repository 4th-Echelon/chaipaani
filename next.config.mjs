// Content Security Policy. 'unsafe-inline' for scripts is required by Next 14's
// hydration bootstrap without a per-request nonce; everything else is locked to
// self, Google Fonts and Cloudflare Turnstile.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://rzp.io",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite", "drizzle-orm", "postgres", "pdf-parse"],
    // Ship the SQL migrations with every serverless function so migrate() can find them.
    outputFileTracingIncludes: { "/**": ["./drizzle/**"] },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: CSP },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    },
    // Public pages are rendered on demand but cached at Vercel's CDN for a minute,
    // so a burst of visitors costs one database round trip, not one per visitor.
    { source: "/", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }] },
    { source: "/(cities|compare|data|dept|know-before-you-go|reports)", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }] },
    { source: "/(dept|reports)/(.*)", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }] },
    { source: "/api/(stats|departments|cities|compare|trending)(.*)", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }] },
    { source: "/admin/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
    { source: "/api/admin/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
  ],
};

export default nextConfig;
