import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".worktrees/**",
      "node_modules/**",
      "supabase/**",
      "tsconfig.tsbuildinfo",
    ],
  },
];

export default config;
