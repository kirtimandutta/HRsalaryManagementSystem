import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Payroll pages read SQLite on each request. Leave the template cache
  // flag off so a salary edit shows up on the next load.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
