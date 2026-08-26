/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cost/classification logic lives in the core workspace package and is
  // consumed as TS source, so Next must transpile it rather than expect
  // a prebuilt dist/.
  transpilePackages: ['@slack-thread-cost/core'],
};

module.exports = nextConfig;
