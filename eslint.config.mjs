import nextVitals from "eslint-config-next/core-web-vitals";

const ignoredPaths = [
  ".next/**",
  "out/**",
  "output/**",
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
