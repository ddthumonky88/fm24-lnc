/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep development cache separate from production builds. Mixing `next dev`
  // and `next build/start` in the same directory can leave stale artifacts on Windows.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  basePath: '/fm',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/fm',
        basePath: false,
        permanent: false,
      },
      {
        source: '/home',
        destination: '/fm/home',
        basePath: false,
        permanent: false,
      },
      {
        source: '/',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/lnc',
        destination: '/fm',
        basePath: false,
        permanent: true,
      },
      {
        source: '/lnc/:path*',
        destination: '/fm/:path*',
        basePath: false,
        permanent: true,
      },
      {
        source: '/confederation',
        destination: '/fm/home',
        basePath: false,
        permanent: true,
      },
      {
        source: '/confederation',
        destination: '/',
        permanent: true,
      },
      {
        source: '/confed/:path*',
        destination: '/home',
        permanent: true,
      },
      {
        source: '/favicon.ico',
        destination: '/fm/favicon.ico',
        basePath: false,
        permanent: false,
      },
      {
        source: '/favicon.png',
        destination: '/fm/favicon.png',
        basePath: false,
        permanent: false,
      },
      {
        source: '/apple-touch-icon.png',
        destination: '/fm/apple-touch-icon.png',
        basePath: false,
        permanent: false,
      },
      {
        source: '/logo.png',
        destination: '/fm/logo.png',
        basePath: false,
        permanent: false,
      },
      {
        source: '/.well-known/appspecific/com.chrome.devtools.json',
        destination: '/fm/chrome-devtools-probe',
        basePath: false,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
        basePath: false,
      },
    ];
  },
};

module.exports = nextConfig;
