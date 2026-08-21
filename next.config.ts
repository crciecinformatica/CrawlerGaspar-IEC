import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["crawlee", "@crawlee/playwright", "@crawlee/core", "playwright", "puppeteer"],
};

export default nextConfig;
