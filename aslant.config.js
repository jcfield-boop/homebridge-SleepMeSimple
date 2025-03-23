import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      // Add any specific rules here
      "no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn"
    },
  },
];
