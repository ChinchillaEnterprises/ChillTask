/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Increase max header size for large Cognito tokens
  serverRuntimeConfig: {
    maxHeaderSize: 32768, // 32KB
  },
};

export default nextConfig;
