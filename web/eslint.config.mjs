import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored VengeanceUI registry components (kept as published; not linted).
    "src/components/vengeance/**",
    // Vendored BeUI chat kit (agents + the motion parts it needs), kept as published.
    "src/components/beui/agents/**",
    "src/components/beui/animated-sidebar.tsx",
    "src/components/beui/popover-morph.tsx",
    "src/components/beui/select.tsx",
  ]),
]);

export default eslintConfig;
