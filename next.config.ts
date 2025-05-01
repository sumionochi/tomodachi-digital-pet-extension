// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js NOT to bundle these; require them at runtime instead
  serverExternalPackages: ['@mysten/walrus', '@mysten/walrus-wasm'],
};

module.exports = nextConfig;
