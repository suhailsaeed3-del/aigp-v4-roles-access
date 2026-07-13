/** @type {import('next').NextConfig} */

// When BUILD_STATIC=1 we produce a fully static export (for GitHub Pages / any
// static host). In that mode the app runs entirely client-side against
// localStorage — no Node server, no Postgres required. The optional API routes
// and Prisma/Postgres layer are only used in the full Docker/server deployment.
const isStatic = process.env.BUILD_STATIC === '1';

// For project pages on GitHub Pages the site is served from /<repo>. Set
// NEXT_PUBLIC_BASE_PATH=/Transformation for that case.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// ---- Security headers (server deployment) ----------------------------------
// Strict, defense-in-depth defaults. CSP allows the app's own inline styles
// (the design uses inline styles) and the configured internal AI endpoint.
const AI_ORIGIN = (() => {
  try {
    return process.env.AI_API_BASE_URL ? new URL(process.env.AI_API_BASE_URL).origin : '';
  } catch {
    return '';
  }
})();

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.uaepass.ae",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Next.js requires 'unsafe-inline' for its bootstrap; keep scripts to self.
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' https://*.uaepass.ae${AI_ORIGIN ? ' ' + AI_ORIGIN : ''}`,
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep client bundles free of Node-only built-ins pulled in by optional
  // export libraries (xlsx / pptxgenjs use these only in a Node context).
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // strip the `node:` scheme so the fallbacks below apply
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        url: false,
        zlib: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
  ...(isStatic
    ? {
        output: 'export',
        images: { unoptimized: true },
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        trailingSlash: true,
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
