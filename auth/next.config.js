/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use pages router (not app router) for compatibility
  pageExtensions: ['js', 'jsx'],
};

module.exports = nextConfig;
