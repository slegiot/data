import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['playwright-core']
    }
};

export default withSentryConfig(nextConfig, {
    // Suppress source map upload logs during build
    silent: true,

    // Upload source maps for better stack traces
    widenClientFileUpload: true,

    // Hide source maps from end users
    hideSourceMaps: true,

    // Disable Sentry telemetry
    disableLogger: true,

    // Skip source map upload if no auth token (e.g. local dev)
    authToken: process.env.SENTRY_AUTH_TOKEN,
});
