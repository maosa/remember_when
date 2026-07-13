import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Any `eslint-disable` directive that stops suppressing something becomes a
    // hard error, so a disable can never silently outlive its reason. Every
    // exception is documented in docs/lint-exceptions.md.
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    // Pin the React-hooks correctness rules we rely on to `error` explicitly, so
    // their severity is intentional and immune to a future preset change.
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
