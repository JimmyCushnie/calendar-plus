const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

// Flat-config port of the former .eslintrc.js. Type-aware linting resolves the
// same types the Obsidian plugin review's type-checker uses, so the
// no-unsafe-* family is enforced here and a regression is caught at build time
// instead of in the published review. Scoped to TypeScript sources only
// (the previous setup ran `eslint . --ext .ts`); JS config files, the bundled
// main.js, and reference/ are not linted.
module.exports = tseslint.config(
  {
    ignores: [
      "node_modules/",
      "main.js",
      "reference/",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": 0,
      // Style/preference rules the Obsidian review does not flag; disabled so
      // the type-aware build stays focused on the no-unsafe-* family that
      // affects the plugin review score.
      "@typescript-eslint/require-await": 0,
      "@typescript-eslint/prefer-regexp-exec": 0,
      "@typescript-eslint/restrict-template-expressions": 0,
    },
  }
);
