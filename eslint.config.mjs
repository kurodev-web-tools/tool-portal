import nextVitals from "eslint-config-next/core-web-vitals";

const ignoredPaths = [
  ".next/**",
  ".open-next/**",
  ".worktrees/**",
  "out/**",
  "output/**",
  "tmp/**",
  "temp/**",
  "node_modules/**"
];

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ignoredPaths
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
