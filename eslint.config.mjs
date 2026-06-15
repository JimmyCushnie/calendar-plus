import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Flat-config (ESM) port of the former eslint.config.js. Type-aware linting
// resolves the same types the Obsidian plugin review's type-checker uses, so
// the no-unsafe-* family is enforced here and a regression is caught at build
// time instead of in the published review. Scoped to TypeScript sources only
// (JS/MJS config files, the bundled main.js, and reference/ are not linted).
export default defineConfig([
  globalIgnores([
    "node_modules/",
    "main.js",
    "reference/",
    "**/*.js",
    "**/*.cjs",
    "**/*.mjs",
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": 0,
      // Surface deprecated-API usage the way the Obsidian review does (it
      // flagged `createClassComponent` in view.ts — intentionally suppressed
      // there with an explanatory directive).
      "@typescript-eslint/no-deprecated": "error",
      // Style/preference rules the Obsidian review does not flag; disabled so
      // the type-aware build stays focused on the no-unsafe-* family that
      // affects the plugin review score.
      "@typescript-eslint/require-await": 0,
      "@typescript-eslint/prefer-regexp-exec": 0,
      "@typescript-eslint/restrict-template-expressions": 0,
    },
  },
]);
