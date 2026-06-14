module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  // Type-aware linting: resolves the same types the Obsidian plugin review's
  // type-checker uses, so the no-unsafe-* family is enforced here and a
  // regression is caught at build time instead of in the published review.
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": 0,
    // Style/preference rules the Obsidian review does not flag; disabled so the
    // type-aware build stays focused on the no-unsafe-* family that affects the
    // plugin review score.
    "@typescript-eslint/require-await": 0,
    "@typescript-eslint/prefer-regexp-exec": 0,
    "@typescript-eslint/restrict-template-expressions": 0,
  },
};
