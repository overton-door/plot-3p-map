import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/plot-3p-map" : "",
  assetPrefix: isGitHubPages ? "/plot-3p-map/" : "",
  trailingSlash: true,
};

export default nextConfig;
