/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore warehouse directory during builds (template code with linting issues)
    ignoreDuringBuilds: false,
    dirs: ['src/app', 'src/components', 'src/lib', 'src/providers', 'src/utils'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Expose server-side environment variables for API routes
  env: {
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
  // Exclude backup folders from build
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/backup/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
